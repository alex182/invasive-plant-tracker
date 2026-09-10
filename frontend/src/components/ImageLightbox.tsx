import { useEffect, useRef } from "react";
import styles from "./ImageLightbox.module.css";

/** Minimum horizontal travel (px) for a touch drag to count as a swipe. */
const SWIPE_THRESHOLD = 50;

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
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Ignore short drags and mostly-vertical ones (those are scrolls, not swipes).
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0 && index < photos.length - 1) onNavigate(index + 1);
    else if (dx > 0 && index > 0) onNavigate(index - 1);
  }

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

      <figure
        className={styles.figure}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img className={styles.image} src={photo.url} alt={photo.alt} draggable={false} />
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
