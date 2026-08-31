import { useEffect } from "react";
import styles from "./ImageLightbox.module.css";

export interface LightboxPhoto {
  url: string;
  alt: string;
  caption?: string;
  attribution?: string;
  source_url?: string;
}

export function ImageLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < photos.length - 1) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        ✕
      </button>

      {index > 0 && (
        <button
          type="button"
          className={`${styles.nav} ${styles.prev}`}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index - 1);
          }}
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          type="button"
          className={`${styles.nav} ${styles.next}`}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index + 1);
          }}
          aria-label="Next photo"
        >
          ›
        </button>
      )}

      <figure className={styles.figure} onClick={(e) => e.stopPropagation()}>
        <img className={styles.image} src={photo.url} alt={photo.alt} />
        {(photo.caption || photo.attribution) && (
          <figcaption className={styles.caption}>
            {photo.caption && <span className={styles.captionText}>{photo.caption}</span>}
            {photo.attribution &&
              (photo.source_url ? (
                <a href={photo.source_url} target="_blank" rel="noreferrer">
                  {photo.attribution}
                </a>
              ) : (
                <span>{photo.attribution}</span>
              ))}
          </figcaption>
        )}
        {photos.length > 1 && (
          <div className={styles.counter}>
            {index + 1} / {photos.length}
          </div>
        )}
      </figure>
    </div>
  );
}
