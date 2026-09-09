import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlants } from "../hooks/usePlants";
import { useSpecies } from "../hooks/useSpecies";
import { useGeolocation, friendlyGeoError } from "../hooks/useGeolocation";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDistance, haversineMeters } from "../lib/geo";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "../lib/status";
import type { Plant, PlantStatus, User } from "../types";
import styles from "./PlantsListPage.module.css";

interface DuplicateGroup {
  species_id: string;
  species_name: string | null;
  plants: Plant[];
}

type SortKey = "species" | "status" | "date_identified" | "distance";

export function PlantsListPage() {
  const { plants, loading, refetch } = usePlants();
  const { species } = useSpecies();
  const { getPosition } = useGeolocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [statusFilter, setStatusFilter] = useState<Set<PlantStatus>>(new Set(STATUS_ORDER));
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [mineOnly, setMineOnly] = useState(() => user?.role !== "admin");
  const [sortKey, setSortKey] = useState<SortKey>("date_identified");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoNote, setGeoNote] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [reassignTo, setReassignTo] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [reassignMessage, setReassignMessage] = useState<string | null>(null);

  const [dupPanelOpen, setDupPanelOpen] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupGroups, setDupGroups] = useState<DuplicateGroup[]>([]);
  const [dupSelected, setDupSelected] = useState<Set<string>>(new Set());
  const [dupDeleting, setDupDeleting] = useState(false);
  const [dupMessage, setDupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) api.users.list().then(setUsers);
  }, [isAdmin]);

  const speciesById = useMemo(() => new Map(species.map((s) => [s.id, s])), [species]);

  async function sortByDistance() {
    setLocating(true);
    setGeoNote(null);
    try {
      const pos = await getPosition();
      setMyPos([pos.latitude, pos.longitude]);
      setSortKey("distance");
      setSortDir("asc");
    } catch (err) {
      setGeoNote(
        err && typeof err === "object" && "code" in err
          ? friendlyGeoError(err as GeolocationPositionError)
          : "Couldn't get your location."
      );
    } finally {
      setLocating(false);
    }
  }

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

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
    setReassignMessage(null);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelected((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }

  async function handleBulkReassign(mode: "move" | "copy") {
    if (selected.size === 0 || !reassignTo) return;
    setReassigning(true);
    setReassignMessage(null);
    try {
      if (mode === "move") {
        const { updated_count } = await api.plants.bulkReassign([...selected], reassignTo);
        setReassignMessage(`Reassigned ${updated_count} plant${updated_count === 1 ? "" : "s"}.`);
      } else {
        const { created_count } = await api.plants.bulkCopy([...selected], reassignTo);
        setReassignMessage(`Copied ${created_count} plant${created_count === 1 ? "" : "s"}.`);
      }
      setSelected(new Set());
      await refetch();
    } catch (err) {
      setReassignMessage(err instanceof Error ? err.message : "Couldn't complete that action.");
    } finally {
      setReassigning(false);
    }
  }

  async function openDuplicatesPanel() {
    setDupPanelOpen(true);
    setDupLoading(true);
    setDupMessage(null);
    try {
      const { groups } = await api.plants.duplicates();
      setDupGroups(groups);
      // Default to keeping the earliest-identified plant in each group and flagging the rest.
      const toFlag = new Set<string>();
      for (const group of groups) {
        const sorted = [...group.plants].sort((a, b) => a.date_identified.localeCompare(b.date_identified));
        for (const p of sorted.slice(1)) toFlag.add(p.id);
      }
      setDupSelected(toFlag);
    } catch (err) {
      setDupMessage(err instanceof Error ? err.message : "Couldn't check for duplicates.");
    } finally {
      setDupLoading(false);
    }
  }

  function closeDuplicatesPanel() {
    setDupPanelOpen(false);
    setDupGroups([]);
    setDupSelected(new Set());
    setDupMessage(null);
  }

  function toggleDupSelected(id: string) {
    setDupSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteDuplicates() {
    if (dupSelected.size === 0) return;
    if (!confirm(`Delete ${dupSelected.size} plant(s)? This cannot be undone.`)) return;
    setDupDeleting(true);
    setDupMessage(null);
    try {
      for (const id of dupSelected) {
        await api.plants.remove(id);
      }
      setDupMessage(`Deleted ${dupSelected.size} plant(s).`);
      setDupGroups((prev) =>
        prev
          .map((g) => ({ ...g, plants: g.plants.filter((p) => !dupSelected.has(p.id)) }))
          .filter((g) => g.plants.length >= 2)
      );
      setDupSelected(new Set());
      await refetch();
    } catch (err) {
      setDupMessage(err instanceof Error ? err.message : "Couldn't delete those plants.");
    } finally {
      setDupDeleting(false);
    }
  }

  const distanceOf = useMemo(() => {
    return (p: { latitude: number; longitude: number }) =>
      myPos ? haversineMeters(myPos, [p.latitude, p.longitude]) : null;
  }, [myPos]);

  const rows = useMemo(() => {
    const filtered = plants.filter((p) => {
      if (!statusFilter.has(p.status)) return false;
      if (speciesFilter && p.species_id !== speciesFilter) return false;
      if (mineOnly && p.owner_id !== user?.id) return false;
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
      } else if (sortKey === "distance" && myPos) {
        cmp = (distanceOf(a) ?? Infinity) - (distanceOf(b) ?? Infinity);
      } else {
        cmp = a.date_identified.localeCompare(b.date_identified);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [plants, statusFilter, speciesFilter, mineOnly, user, sortKey, sortDir, speciesById, myPos, distanceOf]);

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
        <label className={styles.filterChip}>
          <input type="checkbox" checked={mineOnly} onChange={() => setMineOnly((v) => !v)} />
          👤 My plants
        </label>
        <button type="button" className={styles.distanceButton} onClick={sortByDistance} disabled={locating}>
          {locating ? "Locating…" : "📍 Sort by distance"}
        </button>
        <button type="button" className={styles.distanceButton} onClick={openDuplicatesPanel}>
          🧹 Remove duplicates
        </button>
        {isAdmin && (
          <button type="button" className={styles.distanceButton} onClick={toggleSelectMode}>
            {selectMode ? "Cancel" : "🔀 Reassign / copy"}
          </button>
        )}
      </div>

      {selectMode && (
        <div className={styles.bulkBar}>
          <span>{selected.size} selected</span>
          <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
            <option value="">Choose a user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.distanceButton}
            onClick={() => handleBulkReassign("move")}
            disabled={selected.size === 0 || !reassignTo || reassigning}
          >
            {reassigning ? "Working…" : "Reassign"}
          </button>
          <button
            type="button"
            className={styles.distanceButton}
            onClick={() => handleBulkReassign("copy")}
            disabled={selected.size === 0 || !reassignTo || reassigning}
            title="Duplicate the selected plants onto this user's account, leaving the originals untouched"
          >
            {reassigning ? "Working…" : "Copy to user"}
          </button>
          {reassignMessage && <span className={styles.note}>{reassignMessage}</span>}
        </div>
      )}

      {dupPanelOpen && (
        <div className={styles.dupPanel}>
          <div className={styles.dupPanelHeader}>
            <h2>Possible duplicates</h2>
            <button type="button" className={styles.distanceButton} onClick={closeDuplicatesPanel}>
              Close
            </button>
          </div>
          <p className={styles.note}>
            Plants of the same species logged within about 15 m of each other, among your own plants. The
            earliest-identified one in each group is unchecked by default — review before deleting.
          </p>
          {dupLoading && <p className={styles.note}>Checking…</p>}
          {!dupLoading && dupGroups.length === 0 && <p className={styles.note}>No likely duplicates found.</p>}
          {dupGroups.map((group) => (
            <div key={group.species_id + group.plants.map((p) => p.id).join()} className={styles.dupGroup}>
              <h3>{group.species_name ?? "Unknown species"}</h3>
              {group.plants.map((p) => (
                <label key={p.id} className={styles.dupRow}>
                  <input type="checkbox" checked={dupSelected.has(p.id)} onChange={() => toggleDupSelected(p.id)} />
                  <span>
                    {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)} · identified {p.date_identified} ·{" "}
                    {STATUS_LABEL[p.status]}
                    {p.notes ? ` · "${p.notes}"` : ""}
                  </span>
                </label>
              ))}
            </div>
          ))}
          {dupGroups.length > 0 && (
            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.distanceButton}
                onClick={handleDeleteDuplicates}
                disabled={dupSelected.size === 0 || dupDeleting}
              >
                {dupDeleting ? "Deleting…" : `Delete selected (${dupSelected.size})`}
              </button>
            </div>
          )}
          {dupMessage && <p className={styles.note}>{dupMessage}</p>}
        </div>
      )}

      {geoNote && <p className={styles.note}>{geoNote}</p>}
      {loading && <p className={styles.note}>Loading…</p>}
      {!loading && rows.length === 0 && <p className={styles.note}>No plants match these filters.</p>}

      {rows.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {selectMode && (
                  <th>
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={() => toggleSelectAll(rows.map((p) => p.id))}
                      aria-label="Select all"
                    />
                  </th>
                )}
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
                    {selectMode && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelected(p.id)}
                          aria-label={`Select ${sp?.common_name ?? "plant"}`}
                        />
                      </td>
                    )}
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
                      {myPos && (
                        <span className={styles.rowDistance}>
                          {" "}
                          · {formatDistance(distanceOf(p)!)}
                        </span>
                      )}
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
