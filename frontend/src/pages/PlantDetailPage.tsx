import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapContainer, Polygon, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api";
import { isPendingId, pendingPlants, queueTreatmentCreate } from "../lib/offlineQueue";
import { useSpecies } from "../hooks/useSpecies";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "../lib/status";
import type { Plant, PlantStatus, Species, Treatment } from "../types";
import styles from "./PlantDetailPage.module.css";

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function FitToPolygon({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(positions, { padding: [16, 16] });
  }, [map, positions]);
  return null;
}

function isOverdue(followupDue: string | null, done: boolean | number): boolean {
  if (!followupDue || done) return false;
  return followupDue < todayISO();
}

export function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isPending = Boolean(id && isPendingId(id));
  const { species: allSpecies } = useSpecies();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [species, setSpecies] = useState<Species | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speciesPhotoFailed, setSpeciesPhotoFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tDate, setTDate] = useState(todayISO());
  const [tMethod, setTMethod] = useState("");
  const [tHerbicide, setTHerbicide] = useState("");
  const [tOutcome, setTOutcome] = useState("");
  const [autoFollowup, setAutoFollowup] = useState(true);
  const [tFollowup, setTFollowup] = useState(addDaysISO(todayISO(), 120));
  const [savingTreatment, setSavingTreatment] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    if (isPendingId(id)) {
      const p = pendingPlants().find((x) => x.id === id) ?? null;
      setPlant(p);
      setTreatments([]);
      return;
    }
    const p = await api.plants.get(id);
    setPlant(p);
    const [s, t] = await Promise.all([api.species.get(p.species_id), api.treatments.list(id)]);
    setSpecies(s);
    setTreatments(t);
  }, [id]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  useEffect(() => {
    if (isPending && plant) {
      setSpecies(allSpecies.find((s) => s.id === plant.species_id) ?? null);
    }
  }, [isPending, plant, allSpecies]);

  useEffect(() => {
    if (autoFollowup) setTFollowup(addDaysISO(tDate, 120));
  }, [tDate, autoFollowup]);

  async function handleStatusChange(status: PlantStatus) {
    if (!id || isPending) return;
    const updated = await api.plants.update(id, { status });
    setPlant(updated);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || isPending) return;
    const updated = await api.plants.uploadPhoto(id, file);
    setPlant(updated);
  }

  async function handleDelete() {
    if (!id || isPending) return;
    if (!confirm("Delete this plant and its treatment history? This cannot be undone.")) return;
    await api.plants.remove(id);
    navigate("/");
  }

  async function handleAddTreatment(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSavingTreatment(true);
    const payload = {
      date: tDate,
      method: tMethod || null,
      herbicide: tHerbicide || null,
      outcome: tOutcome || null,
      followup_due: tFollowup || null,
    };
    try {
      if (isPending) {
        queueTreatmentCreate(id, payload);
      } else {
        try {
          const created = await api.treatments.create(id, payload);
          setTreatments((prev) => [created, ...prev]);
        } catch (err) {
          if (err instanceof TypeError || !navigator.onLine) {
            queueTreatmentCreate(id, payload);
          } else {
            throw err;
          }
        }
      }
      setTMethod("");
      setTHerbicide("");
      setTOutcome("");
    } finally {
      setSavingTreatment(false);
    }
  }

  async function toggleFollowupDone(t: Treatment) {
    const updated = await api.treatments.update(t.id, { followup_done: !t.followup_done });
    setTreatments((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
  }

  if (error) return <div className={styles.wrap}>{error}</div>;
  if (!plant || !species) return <div className={styles.wrap}>Loading…</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        {species.photos.length > 0 && !speciesPhotoFailed && (
          <img
            className={styles.speciesThumb}
            src={species.photos[0].url}
            alt={species.common_name}
            loading="lazy"
            onError={() => setSpeciesPhotoFailed(true)}
          />
        )}
        <div style={{ flex: 1 }}>
          <h2 className={styles.speciesName}>{species.common_name}</h2>
          <p className={styles.scientific}>{species.scientific_name}</p>
        </div>
        <span className={styles.badge}>
          <span className={styles.dot} style={{ background: STATUS_COLOR[plant.status] }} />
          {STATUS_LABEL[plant.status]}
        </span>
      </div>

      {isPending && (
        <div className={styles.section}>
          Saved offline — will sync automatically once you're back online. Editing, photos, and status
          changes are available after sync.
        </div>
      )}

      <div className={styles.section}>
        <h2>Status</h2>
        <div className={styles.statusButtons}>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              className={s === plant.status ? styles.active : undefined}
              onClick={() => handleStatusChange(s)}
              disabled={isPending}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2>Details</h2>
        {plant.geometry && plant.geometry.length >= 3 && (
          <div style={{ width: "100%", height: 160, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 10 }}>
            <MapContainer
              center={plant.geometry[0]}
              zoom={16}
              dragging={false}
              zoomControl={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              attributionControl={false}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polygon positions={plant.geometry} pathOptions={{ color: STATUS_COLOR[plant.status], fillOpacity: 0.3 }} />
              <FitToPolygon positions={plant.geometry} />
            </MapContainer>
          </div>
        )}
        <dl className={styles.metaGrid}>
          <dt>{plant.geometry ? "Center point" : "Location"}</dt>
          <dd>
            {plant.latitude.toFixed(5)}, {plant.longitude.toFixed(5)}
          </dd>
          {plant.geometry && plant.geometry.length >= 3 && (
            <>
              <dt>Shape</dt>
              <dd>Patch outline ({plant.geometry.length} points)</dd>
            </>
          )}
          <dt>GPS accuracy</dt>
          <dd>{plant.gps_accuracy_m != null ? `±${Math.round(plant.gps_accuracy_m)} m` : "—"}</dd>
          <dt>Method</dt>
          <dd>{plant.method || "—"}</dd>
          <dt>Identified</dt>
          <dd>{plant.date_identified}</dd>
          <dt>Started</dt>
          <dd>{plant.date_started || "—"}</dd>
          <dt>Removed</dt>
          <dd>{plant.date_removed || "—"}</dd>
        </dl>
        {plant.notes && <p className={styles.notes}>{plant.notes}</p>}
        <p className={styles.guideLink}>
          <Link to={`/guide?species=${species.id}`}>View {species.common_name} in the guide →</Link>
        </p>
      </div>

      {!isPending && (
        <div className={styles.section}>
          <h2>Photo</h2>
          {plant.photo_path && <img className={styles.photo} src={plant.photo_path} alt={species.common_name} />}
          <div className={styles.actionRow} style={{ marginTop: 10 }}>
            <label>
              📷 {plant.photo_path ? "Replace photo" : "Add photo"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </label>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2>Treatments</h2>
        {treatments.length === 0 && <p className={styles.notes}>No treatments logged yet.</p>}
        {treatments.map((t) => (
          <div key={t.id} className={styles.treatmentItem}>
            <div>
              <strong>{t.date}</strong>
              {t.method ? ` · ${t.method}` : ""}
              {t.herbicide ? ` · ${t.herbicide}` : ""}
            </div>
            {t.outcome && <div>Outcome: {t.outcome}</div>}
            {t.followup_due && (
              <div className={isOverdue(t.followup_due, t.followup_done) ? styles.overdue : undefined}>
                Follow-up due {t.followup_due}
                {isOverdue(t.followup_due, t.followup_done) ? " (overdue)" : ""}
                {" — "}
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(t.followup_done)}
                    onChange={() => toggleFollowupDone(t)}
                  />{" "}
                  done
                </label>
              </div>
            )}
          </div>
        ))}

        <form className={styles.treatmentForm} onSubmit={handleAddTreatment}>
          <h2 style={{ marginTop: 10 }}>Log a treatment</h2>
          <input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} required />
          <input
            type="text"
            placeholder="Method (e.g. cut-stump, basal bark)"
            value={tMethod}
            onChange={(e) => setTMethod(e.target.value)}
          />
          <input
            type="text"
            placeholder="Herbicide (optional)"
            value={tHerbicide}
            onChange={(e) => setTHerbicide(e.target.value)}
          />
          <textarea
            placeholder="Outcome notes (optional)"
            value={tOutcome}
            onChange={(e) => setTOutcome(e.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={autoFollowup}
              onChange={(e) => setAutoFollowup(e.target.checked)}
            />{" "}
            Auto follow-up (+1 season)
          </label>
          <input
            type="date"
            value={tFollowup}
            onChange={(e) => {
              setAutoFollowup(false);
              setTFollowup(e.target.value);
            }}
          />
          <button type="submit" disabled={savingTreatment}>
            {savingTreatment ? "Saving…" : "Log treatment"}
          </button>
        </form>
      </div>

      {!isPending && (
        <div className={styles.actionRow}>
          <button onClick={() => navigate(`/plants/${plant.id}/edit`)}>✏️ Edit</button>
          <button className={styles.danger} onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}
