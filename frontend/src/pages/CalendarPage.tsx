import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlants } from "../hooks/usePlants";
import { useSpecies } from "../hooks/useSpecies";
import { useTreatments } from "../hooks/useTreatments";
import { api } from "../lib/api";
import type { Species } from "../types";
import styles from "./CalendarPage.module.css";

type EventType = "start" | "treatment" | "followup";

interface CalEvent {
  type: EventType;
  date: string;
  plantId: string;
  label: string;
  overdue: boolean;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function CalendarPage() {
  const { plants } = usePlants();
  const { species } = useSpecies();
  const { treatments } = useTreatments();
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [seasonSpecies, setSeasonSpecies] = useState<Species[]>([]);

  useEffect(() => {
    api.species.seasonNow().then(setSeasonSpecies).catch(() => setSeasonSpecies([]));
  }, []);

  const speciesById = useMemo(() => new Map(species.map((s) => [s.id, s])), [species]);
  const plantsById = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);
  const today = todayISO();

  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = [];
    for (const p of plants) {
      if (p.date_started) {
        const sp = speciesById.get(p.species_id);
        list.push({
          type: "start",
          date: p.date_started,
          plantId: p.id,
          label: `Removal started — ${sp?.common_name ?? "plant"}`,
          overdue: false,
        });
      }
    }
    for (const t of treatments) {
      const plant = plantsById.get(t.plant_id);
      const sp = plant ? speciesById.get(plant.species_id) : undefined;
      list.push({
        type: "treatment",
        date: t.date,
        plantId: t.plant_id,
        label: `Treatment logged — ${sp?.common_name ?? "plant"}`,
        overdue: false,
      });
      if (t.followup_due) {
        const overdue = !t.followup_done && t.followup_due < today;
        list.push({
          type: "followup",
          date: t.followup_due,
          plantId: t.plant_id,
          label: `Follow-up due — ${sp?.common_name ?? "plant"}${overdue ? " (overdue)" : ""}`,
          overdue,
        });
      }
    }
    return list;
  }, [plants, treatments, speciesById, plantsById, today]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of events) {
      const arr = map.get(ev.date) ?? [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    return map;
  }, [events]);

  const seasonPlants = useMemo(() => {
    const seasonIds = new Set(seasonSpecies.map((s) => s.id));
    return plants.filter(
      (p) => (p.status === "planned" || p.status === "pending") && seasonIds.has(p.species_id)
    );
  }, [plants, seasonSpecies]);

  const gridDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    const days: { date: Date; iso: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      days.push({
        date: d,
        iso: d.toISOString().slice(0, 10),
        inMonth: d.getMonth() === month,
      });
    }
    return days;
  }, [monthCursor]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  return (
    <div className={styles.wrap}>
      {seasonSpecies.length > 0 && (
        <div className={styles.season}>
          <h2>In season now</h2>
          {seasonSpecies.map((s) => {
            const matching = seasonPlants.filter((p) => p.species_id === s.id);
            return (
              <div key={s.id} className={styles.seasonSpecies}>
                <strong>{s.common_name}</strong>
                <span>{s.best_timing}</span>
                {matching.length > 0 && (
                  <div className={styles.seasonPlantList}>
                    {matching.length} of your planned/in-progress plant{matching.length === 1 ? "" : "s"}:{" "}
                    {matching.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ", "}
                        <Link to={`/plants/${p.id}`}>{p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}</Link>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.monthNav}>
        <button
          onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2>{monthLabel(monthCursor)}</h2>
        <button
          onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} className={styles.weekday}>
            {w}
          </div>
        ))}
        {gridDays.map(({ date, iso, inMonth }) => {
          const dayEvents = eventsByDate.get(iso) ?? [];
          const hasOverdue = dayEvents.some((e) => e.overdue);
          const types = new Set(dayEvents.map((e) => e.type));
          const classes = [styles.day];
          if (!inMonth) classes.push(styles.outside);
          if (iso === today) classes.push(styles.today);
          if (iso === selectedDate) classes.push(styles.selected);
          return (
            <button key={iso} className={classes.join(" ")} onClick={() => setSelectedDate(iso)}>
              <span>{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <span className={styles.dots}>
                  {types.has("start") && <span className={styles.dot} style={{ background: "var(--event-start)" }} />}
                  {types.has("treatment") && (
                    <span className={styles.dot} style={{ background: "var(--event-treatment)" }} />
                  )}
                  {types.has("followup") && (
                    <span
                      className={styles.dot}
                      style={{ background: hasOverdue ? "var(--danger)" : "var(--event-followup)" }}
                    />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--event-start)" }} /> Removal start
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--event-treatment)" }} /> Treatment
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--event-followup)" }} /> Follow-up due
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--danger)" }} /> Overdue
        </span>
      </div>

      <div className={styles.eventList}>
        {selectedEvents.length === 0 && <p>No events on {selectedDate}.</p>}
        {selectedEvents.map((ev, i) => (
          <Link key={i} to={`/plants/${ev.plantId}`} className={`${styles.event} ${ev.overdue ? styles.overdue : ""}`}>
            <div className={styles.eventType}>{ev.type}</div>
            <div>{ev.label}</div>
          </Link>
        ))}
      </div>

      <div className={styles.exportRow}>
        <a href="/api/export/csv">⬇ Export CSV</a>
        <a href="/api/export/geojson">⬇ Export GeoJSON</a>
      </div>
    </div>
  );
}
