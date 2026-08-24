import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlants } from "../hooks/usePlants";
import { useSpecies } from "../hooks/useSpecies";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "../lib/status";
import type { PlantStatus } from "../types";
import styles from "./PlantsListPage.module.css";

type SortKey = "species" | "status" | "date_identified";

export function PlantsListPage() {
  const { plants, loading } = usePlants();
  const { species } = useSpecies();
  const [statusFilter, setStatusFilter] = useState<Set<PlantStatus>>(new Set(STATUS_ORDER));
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_identified");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const speciesById = useMemo(() => new Map(species.map((s) => [s.id, s])), [species]);

  function toggleStatus(status: PlantStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const rows = useMemo(() => {
    const filtered = plants.filter((p) => {
      if (!statusFilter.has(p.status)) return false;
      if (speciesFilter && p.species_id !== speciesFilter) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "species") {
        const an = speciesById.get(a.species_id)?.common_name ?? "";
        const bn = speciesById.get(b.species_id)?.common_name ?? "";
        cmp = an.localeCompare(bn);
      } else if (sortKey === "status") {
        cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      } else {
        cmp = a.date_identified.localeCompare(b.date_identified);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [plants, statusFilter, speciesFilter, sortKey, sortDir, speciesById]);

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className={styles.sortArrow}>{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filterRow}>
        {STATUS_ORDER.map((status) => (
          <label key={status} className={styles.filterChip}>
            <input type="checkbox" checked={statusFilter.has(status)} onChange={() => toggleStatus(status)} />
            <span className={styles.dot} style={{ background: STATUS_COLOR[status] }} />
            {STATUS_LABEL[status]}
          </label>
        ))}
        <select
          className={styles.speciesSelect}
          value={speciesFilter}
          onChange={(e) => setSpeciesFilter(e.target.value)}
          aria-label="Filter by species"
        >
          <option value="">All species</option>
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.common_name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className={styles.note}>Loading…</p>}
      {!loading && rows.length === 0 && <p className={styles.note}>No plants match these filters.</p>}

      {rows.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th onClick={() => toggleSort("species")}>Species {sortIndicator("species")}</th>
                <th onClick={() => toggleSort("status")}>Status {sortIndicator("status")}</th>
                <th>Location</th>
                <th onClick={() => toggleSort("date_identified")}>Identified {sortIndicator("date_identified")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const sp = speciesById.get(p.species_id);
                const isPatch = Boolean(p.geometry && p.geometry.length >= 3);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/plants/${p.id}`}>{sp?.common_name ?? "Unknown species"}</Link>
                    </td>
                    <td>
                      <span className={styles.statusBadge}>
                        <span className={styles.dot} style={{ background: STATUS_COLOR[p.status] }} />
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td>
                      {isPatch
                        ? `Patch (${p.geometry!.length} pts)`
                        : `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`}
                    </td>
                    <td>{p.date_identified}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
