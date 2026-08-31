import { useState } from "react";
import type { SpeciesLookalike } from "../types";
import { ImageLightbox } from "./ImageLightbox";
import styles from "./SpeciesLookalikes.module.css";

export function SpeciesLookalikes({
  lookalikes,
  speciesLabel,
}: {
  lookalikes: SpeciesLookalike[];
  speciesLabel: string;
}) {
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (lookalikes.length === 0) return null;

  const withPhotos = lookalikes.filter((l): l is SpeciesLookalike & { photo: NonNullable<SpeciesLookalike["photo"]> } => Boolean(l.photo));

  return (
    <div className={styles.list}>
      {lookalikes.map((l, i) => (
        <div key={l.name} className={styles.item}>
          {l.photo && !failed[i] && (
            <button
              type="button"
              className={styles.photoButton}
              onClick={() => setOpenIndex(withPhotos.findIndex((wp) => wp.name === l.name))}
            >
              <img
                className={styles.photo}
                src={l.photo.url}
                alt={`${l.name} (${l.scientific_name}) — commonly confused with ${speciesLabel}`}
                loading="lazy"
                onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
              />
            </button>
          )}
          <div className={styles.body}>
            <div className={styles.name}>{l.name}</div>
            <div className={styles.scientific}>{l.scientific_name}</div>
            <p className={styles.howToTell}>{l.how_to_tell}</p>
            {l.photo?.attribution && (
              <a className={styles.credit} href={l.photo.source_url} target="_blank" rel="noreferrer">
                {l.photo.attribution}
              </a>
            )}
          </div>
        </div>
      ))}
      {openIndex !== null && (
        <ImageLightbox
          photos={withPhotos.map((l) => ({
            url: l.photo.url,
            alt: `${l.name} (${l.scientific_name}) — commonly confused with ${speciesLabel}`,
            caption: l.name,
            attribution: l.photo.attribution,
            source_url: l.photo.source_url,
          }))}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </div>
  );
}
