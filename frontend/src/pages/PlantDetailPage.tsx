import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapContainer, Polygon, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api";
import { isPendingId, pendingPlants, queueTreatmentCreate } from "../lib/offlineQueue";
import { bearingLabel, formatDistance, haversineMeters, mapsDirectionsUrl } from "../lib/geo";
import { useSpecies } from "../hooks/useSpecies";
import { usePlantPhotos } from "../hooks/usePlantPhotos";
import { useGeolocation, friendlyGeoError } from "../hooks/useGeolocation";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "../lib/status";
import { ImageLightbox, type LightboxPhoto } from "../components/ImageLightbox";
import { PlantPhotoGallery } from "../components/PlantPhotoGallery";
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
  const [lightboxPhoto, setLightboxPhoto] = useState<LightboxPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [eSpeciesId, setESpeciesId] = useState("");
  const [eLat, setELat] = useState("");
  const [eLng, setELng] = useState("");
  const [eAccuracy, setEAccuracy] = useState("");
  const [eMethod, setEMethod] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eDateIdentified, setEDateIdentified] = useState("");
  const [eDateStarted, setEDateStarted] = useState("");
  const [eDateRemoved, setEDateRemoved] = useState("");

  const [tDate, setTDate] = useState(todayISO());
  const [tMethod, setTMethod] = useState("");
  const [tHerbicide, setTHerbicide] = useState("");
  const [tOutcome, setTOutcome] = useState("");
  const [autoFollowup, setAutoFollowup] = useState(true);
  const [tFollowup, setTFollowup] = useState(addDaysISO(todayISO(), 120));
  const [savingTreatment, setSavingTreatment] = useState(false);

  const { photos, reload: reloadPhotos } = usePlantPhotos(id, !isPending);
  const [uploading, setUploading] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { getPosition } = useGeolocation();
  const [distance, setDistance] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [regrowthBusy, setRegrowthBusy] = useState(false);

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

  function startEditing() {
    if (!plant) return;
    setESpeciesId(plant.species_id);
    setELat(String(plant.latitude));
    setELng(String(plant.longitude));
    setEAccuracy(plant.gps_accuracy_m != null ? String(plant.gps_accuracy_m) : "");
    setEMethod(plant.method ?? "");
    setENotes(plant.notes ?? "");
    setEDateIdentified(plant.date_identified);
    setEDateStarted(plant.date_started ?? "");
    setEDateRemoved(plant.date_removed ?? "");
    setEditError(null);
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (!id) return;
    const lat = Number(eLat);
    const lng = Number(eLng);
    if (!eSpeciesId) {
      setEditError("Choose a species.");
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setEditError("Latitude and longitude must be numbers.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await api.plants.update(id, {
        species_id: eSpeciesId,
        latitude: lat,
        longitude: lng,
        gps_accuracy_m: eAccuracy ? Number(eAccuracy) : null,
        method: eMethod || null,
        notes: eNotes,
        date_identified: eDateIdentified,
        date_started: eDateStarted || null,
        date_removed: eDateRemoved || null,
      });
      setPlant(updated);
      if (!species || updated.species_id !== species.id) {
        setSpecies(await api.species.get(updated.species_id));
        setSpeciesPhotoFailed(false);
      }
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>, treatmentId?: string) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !id || isPending) return;
    setPhotoError(null);
    setUploading(files.length);
    try {
      for (const file of files) {
        await api.photos.upload(id, file, { taken_on: todayISO(), treatment_id: treatmentId ?? null });
        setUploading((n) => n - 1);
      }
      await reloadPhotos();
      const fresh = await api.plants.get(id);
      setPlant(fresh);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't upload the photo.");
    } finally {
      setUploading(0);
    }
  }

  async function handleShowDistance() {
    if (!plant) return;
    setLocating(true);
    setPhotoError(null);
    try {
      const pos = await getPosition();
      const me: [number, number] = [pos.latitude, pos.longitude];
      const there: [number, number] = [plant.latitude, plant.longitude];
      setDistance(`${formatDistance(haversineMeters(me, there))} · ${bearingLabel(me, there)}`);
    } catch (err) {
      setDistance(
        err && typeof err === "object" && "code" in err
          ? friendlyGeoError(err as GeolocationPositionError)
          : "Couldn't get your location."
      );
    } finally {
      setLocating(false);
    }
  }

  async function handleRegrowth() {
    if (!id || isPending) return;
    if (!confirm("Log regrowth? This reopens the plant as in-progress and adds a follow-up.")) return;
    setRegrowthBusy(true);
    try {
      const { plant: updated, treatment } = await api.plants.regrowth(id);
      setPlant(updated);
      setTreatments((prev) => [treatment, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log regrowth.");
    } finally {
      setRegrowthBusy(false);
    }
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
          <button
            type="button"
            className={styles.speciesThumbButton}
            onClick={() =>
              setLightboxPhoto({
                url: species.photos[0].url,
                alt: species.common_name,
                caption: species.photos[0].caption,
                attribution: species.photos[0].attribution,
                source_url: species.photos[0].source_url,
              })
            }
          >
            <img
              className={styles.speciesThumb}
              src={species.photos[0].url}
              alt={species.common_name}
              loading="lazy"
              onError={() => setSpeciesPhotoFailed(true)}
            />
          </button>
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
        {!isPending && (plant.status === "removed" || plant.status === "monitoring") && (
          <div className={styles.actionRow} style={{ marginTop: 10 }}>
            <button onClick={handleRegrowth} disabled={regrowthBusy}>
              {regrowthBusy ? "Logging…" : "🌱 Found regrowth"}
            </button>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Details</h2>
          {!isPending && !editing && (
            <button type="button" className={styles.editLink} onClick={startEditing}>
              ✏️ Edit
            </button>
          )}
        </div>
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
        {editing ? (
          <div className={styles.editForm}>
            <label>
              Species
              <select value={eSpeciesId} onChange={(e) => setESpeciesId(e.target.value)}>
                {allSpecies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.common_name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.editCoords}>
              <label>
                Latitude
                <input type="number" step="any" value={eLat} onChange={(e) => setELat(e.target.value)} />
              </label>
              <label>
                Longitude
                <input type="number" step="any" value={eLng} onChange={(e) => setELng(e.target.value)} />
              </label>
            </div>
            {plant.geometry && (
              <p className={styles.notes}>
                Editing the patch outline isn't available here — use the coordinates above for the center point.
              </p>
            )}
            <label>
              GPS accuracy (m)
              <input
                type="number"
                step="any"
                value={eAccuracy}
                onChange={(e) => setEAccuracy(e.target.value)}
              />
            </label>
            <label>
              Method
              <input
                type="text"
                placeholder="e.g. cut-stump, basal bark, foliar, hand-pull"
                value={eMethod}
                onChange={(e) => setEMethod(e.target.value)}
              />
            </label>
            <label>
              Notes
              <textarea value={eNotes} onChange={(e) => setENotes(e.target.value)} />
            </label>
            <label>
              Date identified
              <input
                type="date"
                value={eDateIdentified}
                onChange={(e) => setEDateIdentified(e.target.value)}
              />
            </label>
            <label>
              Date started
              <input type="date" value={eDateStarted} onChange={(e) => setEDateStarted(e.target.value)} />
            </label>
            <label>
              Date removed
              <input type="date" value={eDateRemoved} onChange={(e) => setEDateRemoved(e.target.value)} />
            </label>
            {editError && <div className={styles.editError}>{editError}</div>}
            <div className={styles.actionRow}>
              <button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving…" : "💾 Save"}
              </button>
              <button onClick={() => setEditing(false)} disabled={savingEdit}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
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
              {plant.logged_by && (
                <>
                  <dt>Logged by</dt>
                  <dd>{plant.logged_by}</dd>
                </>
              )}
            </dl>
            {plant.notes && <p className={styles.notes}>{plant.notes}</p>}
            <div className={styles.actionRow} style={{ marginTop: 10 }}>
              <a
                className={styles.linkAction}
                href={mapsDirectionsUrl(plant.latitude, plant.longitude)}
                target="_blank"
                rel="noopener noreferrer"
              >
                🧭 Navigate
              </a>
              <button type="button" onClick={handleShowDistance} disabled={locating}>
                {locating ? "Locating…" : "📏 Distance from me"}
              </button>
              {distance && <span className={styles.distance}>{distance}</span>}
            </div>
          </>
        )}
        <p className={styles.guideLink}>
          <Link to={`/guide?species=${species.id}`}>View {species.common_name} in the guide →</Link>
        </p>
      </div>

      {!isPending && (
        <div className={styles.section}>
          <h2>Photos</h2>
          {photos.filter((p) => !p.treatment_id).length === 0 && (
            <p className={styles.notes}>No general photos yet.</p>
          )}
          <PlantPhotoGallery
            photos={photos.filter((p) => !p.treatment_id)}
            speciesLabel={species.common_name}
            onChanged={async () => {
              await reloadPhotos();
              setPlant(await api.plants.get(id!));
            }}
          />
          {photoError && <div className={styles.editError}>{photoError}</div>}
          <div className={styles.actionRow} style={{ marginTop: 10 }}>
            <label>
              📷 {uploading > 0 ? `Uploading ${uploading}…` : "Add photos"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handlePhotoChange(e)}
                disabled={uploading > 0}
              />
            </label>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2>Treatments</h2>
        {treatments.length === 0 && <p className={styles.notes}>No treatments logged yet.</p>}
        {treatments.map((t) => {
          const tPhotos = photos.filter((p) => p.treatment_id === t.id);
          return (
            <div key={t.id} className={styles.treatmentItem}>
              <div>
                <strong>{t.date}</strong>
                {t.method ? ` · ${t.method}` : ""}
                {t.herbicide ? ` · ${t.herbicide}` : ""}
                {t.logged_by ? ` · ${t.logged_by}` : ""}
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
              {!isPending && (
                <>
                  <PlantPhotoGallery
                    photos={tPhotos}
                    speciesLabel={species.common_name}
                    onChanged={async () => {
                      await reloadPhotos();
                      setPlant(await api.plants.get(id!));
                    }}
                  />
                  <label className={styles.treatmentPhotoAdd}>
                    📷 Add photo to this treatment
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => handlePhotoChange(e, t.id)}
                      disabled={uploading > 0}
                    />
                  </label>
                </>
              )}
            </div>
          );
        })}

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
          <button className={styles.danger} onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      )}

      {lightboxPhoto && (
        <ImageLightbox
          photos={[lightboxPhoto]}
          index={0}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={() => {}}
        />
      )}
    </div>
  );
}
