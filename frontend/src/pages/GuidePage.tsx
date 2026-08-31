import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SpeciesPhotoGallery } from "../components/SpeciesPhotoGallery";
import { SpeciesLookalikes } from "../components/SpeciesLookalikes";
import { SpeciesRemovalMethods } from "../components/SpeciesRemovalMethods";
import { useSpecies } from "../hooks/useSpecies";
import styles from "./GuidePage.module.css";

export function GuidePage() {
  const { species, loading } = useSpecies();
  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("species");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return species;
    return species.filter(
      (s) => s.common_name.toLowerCase().includes(q) || s.scientific_name.toLowerCase().includes(q)
    );
  }, [species, query]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`species-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightId, species]);

  if (loading) return <div className={styles.wrap}>Loading…</div>;

  return (
    <div className={styles.wrap}>
      <input
        className={styles.search}
        type="search"
        placeholder="Search species by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filtered.map((s) => (
        <article
          key={s.id}
          id={`species-${s.id}`}
          className={`${styles.card} ${highlightId === s.id ? styles.highlighted : ""}`}
        >
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.commonName}>{s.common_name}</h2>
              <div className={styles.scientific}>{s.scientific_name}</div>
            </div>
            <span className={styles.category}>{s.category}</span>
          </div>

          {s.photos.length > 0 && (
            <SpeciesPhotoGallery photos={s.photos} speciesLabel={`${s.common_name} (${s.scientific_name})`} />
          )}

          <div className={styles.row}>
            <h3>ID summary</h3>
            <p>{s.id_summary}</p>
          </div>
          <div className={styles.row}>
            <h3>Key tell</h3>
            <p>{s.id_key_tell}</p>
          </div>
          {s.lookalikes.length > 0 && (
            <div className={styles.row}>
              <h3>Non-invasive look-alikes</h3>
              <SpeciesLookalikes
                lookalikes={s.lookalikes}
                speciesLabel={`${s.common_name} (${s.scientific_name})`}
              />
            </div>
          )}
          <div className={styles.row}>
            <h3>Removal</h3>
            <p>{s.removal_summary}</p>
          </div>
          <div className={styles.row}>
            <h3>Best timing</h3>
            <p>{s.best_timing}</p>
          </div>
          <div className={styles.row}>
            <h3>Herbicide notes</h3>
            <p>{s.herbicide_notes}</p>
          </div>
          {s.removal_methods.length > 0 && (
            <div className={styles.row}>
              <h3>Removal methods, in detail</h3>
              <SpeciesRemovalMethods methods={s.removal_methods} />
            </div>
          )}
          {s.source_links.length > 0 && (
            <div className={styles.row}>
              <h3>Sources</h3>
              <div className={styles.links}>
                {s.source_links.map((link) => (
                  <a key={link} href={link} target="_blank" rel="noreferrer">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
