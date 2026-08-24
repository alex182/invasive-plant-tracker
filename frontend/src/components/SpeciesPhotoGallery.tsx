import { useState } from "react";
import type { SpeciesPhoto } from "../types";
import styles from "./SpeciesPhotoGallery.module.css";

export function SpeciesPhotoGallery({ photos, speciesLabel }: { photos: SpeciesPhoto[]; speciesLabel: string }) {
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const visible = photos.filter((_, i) => !failed[i]);

  if (visible.length === 0) return null;

  return (
    <div className={styles.gallery}>
      {photos.map((photo, i) =>
        failed[i] ? null : (
          <figure key={photo.url} className={styles.item}>
            <img
              src={photo.url}
              alt={`${speciesLabel} — ${photo.caption}`}
              loading="lazy"
              onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
            />
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
    </div>
  );
}
