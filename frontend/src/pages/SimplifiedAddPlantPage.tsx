import { useEffect, useRef, useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSpecies } from "../hooks/useSpecies";
import { api } from "../lib/api";
import { queuePlantCreate } from "../lib/offlineQueue";
import type { IdentifyResult, Plant, Species } from "../types";
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The "add a plant" half of a "simplified" account (see backend Role type; the other half is a
 * read-only Map): identify a plant from a photo, confirm the species, grab a GPS location, and
 * save — no editing, no patch drawing, nothing to revisit afterward. Built for kids/non-technical
 * users who just need to capture a find in the field without the full app's surface area.
 */
export function SimplifiedAddPlantPage() {
  const { species, loading: speciesLoading } = useSpecies();
  const { getPosition, loading: locating, error: geoError } = useGeolocation();

  const [speciesId, setSpeciesId] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const [identifying, setIdentifying] = useState(false);
  const [identifyResults, setIdentifyResults] = useState<IdentifyResult[] | null>(null);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const identifyInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
    if (!speciesId && species.length > 0) setSpeciesId(species[0].id);
  }, [species, speciesId]);

  async function handleIdentifyPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoFile(file);
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

  async function handleUseCurrentLocation() {
    try {
      const pos = await getPosition();
      setLatitude(pos.latitude);
      setLongitude(pos.longitude);
      setAccuracy(pos.accuracy);
    } catch {
      // geoError state already set by the hook; surfaced in the UI below.
    }
  }

  useEffect(() => {
    // Grab the location right away — one less tap for the audience this screen is built for.
    handleUseCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForAnother() {
    setSpeciesId(species[0]?.id ?? "");
    setLatitude(null);
    setLongitude(null);
    setAccuracy(null);
    setIdentifyResults(null);
    setIdentifyError(null);
    setPhotoFile(null);
    setError(null);
    setSaved(false);
    handleUseCurrentLocation();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!speciesId) {
      setError("Choose or identify a species first.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Get your location first.");
      return;
    }

    const payload: Partial<Plant> = {
      species_id: speciesId,
      latitude,
      longitude,
      gps_accuracy_m: accuracy,
      status: "planned",
      notes: "",
      date_identified: todayISO(),
      geometry: null,
    };

    setSubmitting(true);
    try {
      const created = await api.plants.create(payload);
      if (photoFile) {
        try {
          await api.photos.upload(created.id, photoFile, { phase: "before", taken_on: todayISO() });
        } catch {
          // The plant saved; a failed photo upload shouldn't block confirming success.
        }
      }
      setSaved(true);
    } catch (err) {
      if (err instanceof TypeError || !navigator.onLine) {
        // Network unreachable: queue for background sync instead of losing the entry.
        queuePlantCreate(payload);
        setSaved(true);
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (saved) {
    return (
      <form className={styles.form}>
        <p className={styles.gpsNote}>✅ Saved! Thanks for logging that plant.</p>
        <button type="button" className={styles.submit} onClick={resetForAnother}>
          Add another plant
        </button>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <button
          type="button"
          className={styles.gpsButton}
          onClick={() => identifyInputRef.current?.click()}
          disabled={identifying}
        >
          📷 {identifying ? "Identifying…" : "Take a photo to identify"}
        </button>
        <input
          ref={identifyInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleIdentifyPhoto}
        />
        {photoPreview && <img src={photoPreview} alt="Photo of the plant" className={styles.photoPreview} />}
        <div className={styles.gpsNote}>Suggestions only — pick the right one below before saving.</div>
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
        <button type="button" className={styles.gpsButton} onClick={handleUseCurrentLocation} disabled={locating}>
          📍 {locating ? "Getting location…" : latitude !== null ? "Location captured — get again" : "Get my location"}
        </button>
        {accuracy != null && latitude !== null && (
          <div className={styles.gpsNote}>Got it! GPS accuracy: ±{Math.round(accuracy)} m</div>
        )}
        {geoError && <div className={styles.error}>Couldn't get your location: {geoError}</div>}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button className={styles.submit} type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Save plant"}
      </button>
    </form>
  );
}
