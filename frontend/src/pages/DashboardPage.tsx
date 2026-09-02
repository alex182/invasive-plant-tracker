import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlants } from "../hooks/usePlants";
import { useSpecies } from "../hooks/useSpecies";
import { useTreatments } from "../hooks/useTreatments";
import { api } from "../lib/api";
import { formatArea, polygonAreaSqMeters } from "../lib/geo";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "../lib/status";
import type { Species } from "../types";
import styles from "./DashboardPage.module.css";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardPage() {
  const { plants, loading: plantsLoading } = usePlants();
  const { species } = useSpecies();
  const { treatments } = useTreatments();
  const [seasonSpecies, setSeasonSpecies] = useState<Species[]>([]);

  useEffect(() => {
    api.species.seasonNow().then(setSeasonSpecies).catch(() => setSeasonSpecies([]));
  }, []);

  const speciesById = useMemo(() => new Map(species.map((s) => [s.id, s])), [species]);

  const statusCounts = useMemo(() => {
    const counts = { planned: 0, pending: 0, monitoring: 0, removed: 0 };
    for (const p of plants) counts[p.status]++;
    return counts;
  }, [plants]);

  const total = plants.length;
  const removedPct = total > 0 ? Math.round((statusCounts.removed / total) * 100) : 0;

  const bySpecies = useMemo(() => {
    const map = new Map<string, { name: string; total: number; removed: number }>();
    for (const p of plants) {
      const name = speciesById.get(p.species_id)?.common_name ?? "Unknown";
      const row = map.get(p.species_id) ?? { name, total: 0, removed: 0 };
      row.total++;
      if (p.status === "removed") row.removed++;
      map.set(p.species_id, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [plants, speciesById]);

  const patchStats = useMemo(() => {
    let area = 0;
    let patches = 0;
    for (const p of plants) {
      if (p.geometry && p.geometry.length >= 3) {
        patches++;
        area += polygonAreaSqMeters(p.geometry);
      }
    }
    return { area, patches, points: total - patches };
  }, [plants, total]);

  const treatmentsByMonth = useMemo(() => {
    const buckets: { label: string; key: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: monthKey(d), label: d.toLocaleString(undefined, { month: "short" }), count: 0 });
    }
    const index = new Map(buckets.map((b) => [b.key, b]));
    for (const t of treatments) {
      const bucket = index.get(t.date.slice(0, 7));
      if (bucket) bucket.count++;
    }
    return buckets;
  }, [treatments]);

  const maxMonth = Math.max(1, ...treatmentsByMonth.map((b) => b.count));

  const followups = useMemo(() => {
    const today = todayISO();
    const weekOut = new Date();
    weekOut.setDate(weekOut.getDate() + 7);
    const weekISO = weekOut.toISOString().slice(0, 10);
    let overdue = 0;
    let dueThisWeek = 0;
    for (const t of treatments) {
      if (!t.followup_due || t.followup_done) continue;
      if (t.followup_due < today) overdue++;
      else if (t.followup_due <= weekISO) dueThisWeek++;
    }
    return { overdue, dueThisWeek };
  }, [treatments]);

  const inSeasonActive = useMemo(() => {
    const seasonIds = new Set(seasonSpecies.map((s) => s.id));
    const active = new Set<string>();
    for (const p of plants) {
      if (p.status !== "removed" && seasonIds.has(p.species_id)) active.add(p.species_id);
    }
    return active.size;
  }, [plants, seasonSpecies]);

  if (plantsLoading) return <div className={styles.wrap}>Loading…</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h2>Progress</h2>
        <div className={styles.bigStat}>
          <strong>{removedPct}%</strong> removed <span className={styles.muted}>({total} plants tracked)</span>
        </div>
        <div className={styles.bars}>
          {STATUS_ORDER.map((s) => {
            const count = statusCounts[s];
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={s} className={styles.barRow}>
                <span className={styles.barLabel}>{STATUS_LABEL[s]}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: `${pct}%`, background: STATUS_COLOR[s] }}
                  />
                </span>
                <span className={styles.barCount}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.card}>
        <h2>Follow-ups</h2>
        <div className={styles.pillRow}>
          <span className={followups.overdue > 0 ? styles.pillDanger : styles.pill}>
            {followups.overdue} overdue
          </span>
          <span className={styles.pill}>{followups.dueThisWeek} due this week</span>
          <span className={styles.pill}>{inSeasonActive} species in season now</span>
        </div>
        <p className={styles.muted}>
          <Link to="/calendar">Open the calendar →</Link>
        </p>
      </div>

      <div className={styles.card}>
        <h2>Patch area</h2>
        <div className={styles.bigStat}>
          <strong>{formatArea(patchStats.area)}</strong>
        </div>
        <p className={styles.muted}>
          {patchStats.patches} mapped {patchStats.patches === 1 ? "patch" : "patches"} · {patchStats.points}{" "}
          point {patchStats.points === 1 ? "record" : "records"}
        </p>
      </div>

      <div className={styles.card}>
        <h2>Treatments logged (last 12 months)</h2>
        <div className={styles.chart}>
          {treatmentsByMonth.map((b) => (
            <div key={b.key} className={styles.chartCol}>
              <span className={styles.chartValue}>{b.count || ""}</span>
              <span
                className={styles.chartBar}
                style={{ height: `${(b.count / maxMonth) * 100}%` }}
              />
              <span className={styles.chartLabel}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h2>By species</h2>
        <table className={styles.speciesTable}>
          <thead>
            <tr>
              <th>Species</th>
              <th>Total</th>
              <th>Removed</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {bySpecies.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.total}</td>
                <td>{row.removed}</td>
                <td>{row.total - row.removed}</td>
              </tr>
            ))}
            {bySpecies.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.muted}>
                  No plants tracked yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
