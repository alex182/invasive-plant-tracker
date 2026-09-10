import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MapContainer, Polygon, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSpecies } from "../hooks/useSpecies";
import { api } from "../lib/api";
import { queuePlantCreate } from "../lib/offlineQueue";
import { STATUS_LABEL, STATUS_ORDER } from "../lib/status";
import { useAuth } from "../context/AuthContext";
import type { IdentifyResult, Plant, PlantStatus, Species, User } from "../types";
import styles from "./PlantFormPage.module.css";

/** Matches a Pl@ntNet scientific name against our small tracked catalog by exact genus+species. */
function matchSpeciesId(scientificName: string, catalog: Species[]): string | null {
  const target = scientificName.toLowerCase().trim().split(/\s+/).slice(0, 2).join(" ");
  for (const s of catalog) {
    const candidates = s.scientific_name.split(",").map((n) => n.trim().toLowerCase());
    for (const candidate of candidates) {
      const candidateGenusSpecies = candidate.split(/\s+/).slice(0, 2).join(" ");
      if (candidateGenusSpecies === target) return s.id;
    }
  }
  return null;
}

function FitToPolygon({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(positions, { padding: [16, 16] });
  }, [map, positions]);
  return null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseGeometryParam(raw: string | null): [number, number][] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 3) return parsed;
  } catch {
    // Malformed/missing geometry param: treat as a plain point.
  }
  return null;
}

function parseStatusParam(raw: string | null): PlantStatus | null {
  return raw && (STATUS_ORDER as string[]).includes(raw) ? (raw as PlantStatus) : null;
}

export function PlantFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { species, loading: speciesLoading } = useSpecies();
  const { getPosition, loading: locating, error: geoError } = useGeolocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [users, setUsers] = useState<User[]>([]);
  const [ownerId, setOwnerId] = useState("");

  const [speciesId, setSpeciesId] = useState(searchParams.get("species") ?? "");
  const [latitude, setLatitude] = useState(searchParams.get("lat") ?? "");
  const [longitude, setLongitude] = useState(searchParams.get("lng") ?? "");
  const [accuracy, setAccuracy] = useState(searchParams.get("accuracy") ?? "");
  const [status, setStatus] = useState<PlantStatus>(parseStatusParam(searchParams.get("status")) ?? "planned");
  const [method, setMethod] = useState(searchParams.get("method") ?? "");
  const [notes, setNotes] = useState(searchParams.get("notes") ?? "");
  const [dateIdentified, setDateIdentified] = useState(searchParams.get("dateIdentified") ?? todayISO());
  const [dateStarted, setDateStarted] = useState(searchParams.get("dateStarted") ?? "");
  const [dateRemoved, setDateRemoved] = useState(searchParams.get("dateRemoved") ?? "");
  const [geometry, setGeometry] = useState<[number, number][] | null>(
    parseGeometryParam(searchParams.get("geometry"))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identifyResults, setIdentifyResults] = useState<IdentifyResult[] | null>(null);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const identifyInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // Photo attached at creation time, saved as the plant's "Before" progress photo.
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoFromIdentify, setPhotoFromIdentify] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (!isEdit || !id) return;
    api.plants.get(id).then((plant: Plant) => {
      setSpeciesId(plant.species_id);
      setLatitude(String(plant.latitude));
      setLongitude(String(plant.longitude));
      setAccuracy(plant.gps_accuracy_m != null ? String(plant.gps_accuracy_m) : "");
      setStatus(plant.status);
      setMethod(plant.method ?? "");
      setNotes(plant.notes ?? "");
      setDateIdentified(plant.date_identified);
      setDateStarted(plant.date_started ?? "");
      setDateRemoved(plant.date_removed ?? "");
      setGeometry(plant.geometry ?? null);
      setOwnerId(plant.owner_id ?? "");
    });
  }, [isEdit, id]);

  useEffect(() => {
    if (!isAdmin || !isEdit) return;
    api.users.list().then(setUsers);
  }, [isAdmin, isEdit]);

  useEffect(() => {
    if (!isEdit && !speciesId && species.length > 0) {
      setSpeciesId(species[0].id);
    }
  }, [isEdit, species, speciesId]);

  function handleDrawPatch(mode: "tap" | "walk") {
    const params = new URLSearchParams();
    params.set("draw", mode);
    if (speciesId) params.set("species", speciesId);
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (notes) params.set("notes", notes);
    if (dateIdentified) params.set("dateIdentified", dateIdentified);
    if (dateStarted) params.set("dateStarted", dateStarted);
    if (dateRemoved) params.set("dateRemoved", dateRemoved);
    navigate(`/?${params.toString()}`);
  }

  async function handleUseCurrentLocation() {
    try {
      const pos = await getPosition();
      setLatitude(String(pos.latitude));
      setLongitude(String(pos.longitude));
      setAccuracy(String(pos.accuracy));
    } catch {
      // geoError state already set by the hook; surfaced in the UI below.
    }
  }

  async function handleIdentifyPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Reuse the identification photo as the plant's "Before" photo unless one's already chosen.
    if (!photoFile) {
      setPhotoFile(file);
      setPhotoFromIdentify(true);
    }
    setIdentifying(true);
    setIdentifyError(null);
    setIdentifyResults(null);
    try {
      const { results } = await api.identify.fromPhoto(file);
      setIdentifyResults(results);
    } catch (err) {
      setIdentifyError(err instanceof Error ? err.message : "Couldn't identify this photo.");
    } finally {
      setIdentifying(false);
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      setPhotoFile(file);
      setPhotoFromIdentify(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!speciesId) {
      setError("Choose a species.");
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Latitude and longitude must be numbers.");
      return;
    }

    const payload: Partial<Plant> = {
      species_id: speciesId,
      latitude: lat,
      longitude: lng,
      gps_accuracy_m: accuracy ? Number(accuracy) : null,
      status,
      method: method || null,
      notes,
      date_identified: dateIdentified,
      date_started: dateStarted || null,
      date_removed: dateRemoved || null,
      geometry,
    };

    if (isEdit && isAdmin && ownerId) payload.owner_id = ownerId;

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await api.plants.update(id, payload);
        navigate(`/plants/${id}`);
      } else {
        const created = await api.plants.create(payload);
        if (photoFile) {
          try {
            await api.photos.upload(created.id, photoFile, { phase: "before", taken_on: dateIdentified });
          } catch {
            // The plant saved; a failed photo upload shouldn't block navigation to it.
          }
        }
        navigate(`/plants/${created.id}`);
      }
    } catch (err) {
      if (!isEdit && (err instanceof TypeError || !navigator.onLine)) {
        // Network unreachable: queue for background sync instead of losing the entry.
        queuePlantCreate(payload);
        navigate("/");
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="species">Species</label>
        <select
          id="species"
          value={speciesId}
          onChange={(e) => setSpeciesId(e.target.value)}
          disabled={speciesLoading}
          required
        >
          <option value="" disabled>
            Select a species…
          </option>
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.common_name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <button
          type="button"
          className={styles.gpsButton}
          onClick={() => identifyInputRef.current?.click()}
          disabled={identifying}
        >
          📷 {identifying ? "Identifying…" : "Identify from photo"}
        </button>
        <input
          ref={identifyInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleIdentifyPhoto}
        />
        <div className={styles.gpsNote}>Suggestions only — confirm the species yourself before saving.</div>
        {identifyError && <div className={styles.error}>{identifyError}</div>}
        {identifyResults && (
          <div className={styles.identifyResults}>
            {identifyResults.length === 0 && <p className={styles.gpsNote}>No confident matches. Try a clearer photo.</p>}
            {identifyResults.map((r, i) => {
              const matchId = matchSpeciesId(r.scientific_name, species);
              return (
                <button
                  key={i}
                  type="button"
                  className={styles.identifyChip}
                  onClick={() => matchId && setSpeciesId(matchId)}
                  disabled={!matchId}
                >
                  <strong>{r.common_names[0] ?? r.scientific_name}</strong>
                  <span className={styles.gpsNote}>
                    {" "}
                    ({Math.round(r.score * 100)}% match{matchId ? "" : " · not in your tracked list"})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!isEdit && (
        <div className={styles.field}>
          <label>Photo (optional — saved as the “Before” photo)</label>
          {photoPreview && <img src={photoPreview} alt="Selected plant" className={styles.photoPreview} />}
          <button
            type="button"
            className={styles.gpsButton}
            onClick={() => photoInputRef.current?.click()}
          >
            📷 {photoFile ? "Replace photo" : "Add a photo"}
          </button>
          {photoFile && (
            <button
              type="button"
              className={styles.gpsButton}
              onClick={() => {
                setPhotoFile(null);
                setPhotoFromIdentify(false);
              }}
            >
              Remove photo
            </button>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handlePhotoSelect}
          />
          <div className={styles.gpsNote}>
            {photoFromIdentify ? "Using your identification photo. " : ""}
            Added once the plant is saved — needs a connection.
          </div>
        </div>
      )}

      {geometry ? (
        <div className={styles.field}>
          <label>Patch outline</label>
          <div className={styles.patchPreview}>
            <MapContainer
              center={geometry[0]}
              zoom={16}
              dragging={false}
              zoomControl={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              attributionControl={false}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polygon positions={geometry} pathOptions={{ color: "var(--accent)", fillOpacity: 0.25 }} />
              <FitToPolygon positions={geometry} />
            </MapContainer>
          </div>
          <div className={styles.gpsNote}>{geometry.length} points · center point shown below</div>
        </div>
      ) : (
        <div className={styles.locationChoice}>
          <button type="button" className={styles.gpsButton} onClick={handleUseCurrentLocation} disabled={locating}>
            📍 {locating ? "Getting location…" : "Use current GPS location"}
          </button>
          {!isEdit && (
            <>
              <button type="button" className={styles.gpsButton} onClick={() => handleDrawPatch("tap")}>
                ⬟ Draw a patch outline
              </button>
              <button type="button" className={styles.gpsButton} onClick={() => handleDrawPatch("walk")}>
                🚶 Walk a patch outline
              </button>
            </>
          )}
        </div>
      )}

      <div className={styles.coords}>
        <div className={styles.field}>
          <label htmlFor="lat">Latitude</label>
          <input
            id="lat"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            disabled={Boolean(geometry)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="lng">Longitude</label>
          <input
            id="lng"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            disabled={Boolean(geometry)}
            required
          />
        </div>
      </div>
      {accuracy && <div className={styles.gpsNote}>GPS accuracy: ±{Math.round(Number(accuracy))} m</div>}
      {geoError && <div className={styles.error}>Couldn't get GPS location: {geoError}</div>}

      <div className={styles.field}>
        <label htmlFor="status">Status</label>
        <select id="status" value={status} onChange={(e) => setStatus(e.target.value as PlantStatus)}>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="method">Removal method</label>
        <input
          id="method"
          type="text"
          placeholder="e.g. cut-stump, basal bark, foliar, hand-pull"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label htmlFor="dateIdentified">Date identified</label>
        <input
          id="dateIdentified"
          type="date"
          value={dateIdentified}
          onChange={(e) => setDateIdentified(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="dateStarted">Date started (optional)</label>
        <input id="dateStarted" type="date" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label htmlFor="dateRemoved">Date removed (optional)</label>
        <input id="dateRemoved" type="date" value={dateRemoved} onChange={(e) => setDateRemoved(e.target.value)} />
      </div>

      {isEdit && isAdmin && (
        <div className={styles.field}>
          <label htmlFor="owner">Owner</label>
          <select id="owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <button className={styles.submit} type="submit" disabled={submitting}>
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Save plant"}
      </button>
    </form>
  );
}
