import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MapContainer, Polygon, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSpecies } from "../hooks/useSpecies";
import { api } from "../lib/api";
import { queuePlantCreate } from "../lib/offlineQueue";
import { STATUS_LABEL, STATUS_ORDER } from "../lib/status";
import type { Plant, PlantStatus } from "../types";
import styles from "./PlantFormPage.module.css";

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

export function PlantFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { species, loading: speciesLoading } = useSpecies();
  const { getPosition, loading: locating, error: geoError } = useGeolocation();

  const [speciesId, setSpeciesId] = useState("");
  const [latitude, setLatitude] = useState(searchParams.get("lat") ?? "");
  const [longitude, setLongitude] = useState(searchParams.get("lng") ?? "");
  const [accuracy, setAccuracy] = useState(searchParams.get("accuracy") ?? "");
  const [status, setStatus] = useState<PlantStatus>("planned");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [dateIdentified, setDateIdentified] = useState(todayISO());
  const [dateStarted, setDateStarted] = useState("");
  const [dateRemoved, setDateRemoved] = useState("");
  const [geometry, setGeometry] = useState<[number, number][] | null>(
    parseGeometryParam(searchParams.get("geometry"))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    });
  }, [isEdit, id]);

  useEffect(() => {
    if (!isEdit && !speciesId && species.length > 0) {
      setSpeciesId(species[0].id);
    }
  }, [isEdit, species, speciesId]);

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

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await api.plants.update(id, payload);
        navigate(`/plants/${id}`);
      } else {
        const created = await api.plants.create(payload);
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
        <button type="button" className={styles.gpsButton} onClick={handleUseCurrentLocation} disabled={locating}>
          📍 {locating ? "Getting location…" : "Use current GPS location"}
        </button>
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

      {error && <div className={styles.error}>{error}</div>}

      <button className={styles.submit} type="submit" disabled={submitting}>
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Save plant"}
      </button>
    </form>
  );
}
