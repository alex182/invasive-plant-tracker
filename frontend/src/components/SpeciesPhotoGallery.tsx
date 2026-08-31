import { useState } from "react";
import type { SpeciesPhoto } from "../types";
import { ImageLightbox } from "./ImageLightbox";
import styles from "./SpeciesPhotoGallery.module.css";

export function SpeciesPhotoGallery({ photos, speciesLabel }: { photos: SpeciesPhoto[]; speciesLabel: string }) {
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const visible = photos.filter((_, i) => !failed[i]);

  if (visible.length === 0) return null;

  return (
    <div className={styles.gallery}>
      {photos.map((photo, i) =>
        failed[i] ? null : (
          <figure key={photo.url} className={styles.item}>
            <button type="button" className={styles.imageButton} onClick={() => setOpenIndex(i)}>
              <img
                src={photo.url}
                alt={`${speciesLabel} — ${photo.caption}`}
                loading="lazy"
                onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
              />
            </button>
            <figcaption>
              <span className={styles.caption}>{photo.caption}</span>
              {photo.attribution && (
                <a href={photo.source_url} target="_blank" rel="noreferrer">
                  {photo.attribution}
                </a>
              )}
            </figcaption>
          </figure>
        )
      )}
      {openIndex !== null && (
        <ImageLightbox
          photos={photos.map((p) => ({
            url: p.url,
            alt: `${speciesLabel} — ${p.caption}`,
            caption: p.caption,
            attribution: p.attribution,
            source_url: p.source_url,
          }))}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </div>
  );
}
