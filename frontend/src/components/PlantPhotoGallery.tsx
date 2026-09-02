import { useState } from "react";
import { api } from "../lib/api";
import { ImageLightbox, type LightboxPhoto } from "./ImageLightbox";
import type { PlantPhoto } from "../types";
import styles from "./PlantPhotoGallery.module.css";

export function PlantPhotoGallery({
  photos,
  speciesLabel,
  onChanged,
}: {
  photos: PlantPhoto[];
  speciesLabel: string;
  /** Called after a photo is edited or deleted so the parent can refetch. */
  onChanged: () => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const [draftDate, setDraftDate] = useState("");

  if (photos.length === 0) return null;

  const lightboxPhotos: LightboxPhoto[] = photos.map((p) => ({
    url: p.path,
    alt: `${speciesLabel} — ${p.taken_on}`,
    caption: [p.taken_on, p.caption].filter(Boolean).join(" · "),
  }));

  function startEdit(p: PlantPhoto) {
    setEditId(p.id);
    setDraftCaption(p.caption);
    setDraftDate(p.taken_on);
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    try {
      await api.photos.update(id, { caption: draftCaption, taken_on: draftDate });
      setEditId(null);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this photo? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await api.photos.remove(id);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className={styles.gallery}>
        {photos.map((p, i) => (
          <figure key={p.id} className={styles.item}>
            <button type="button" className={styles.imageButton} onClick={() => setOpenIndex(i)}>
              <img src={p.path} alt={`${speciesLabel} ${p.taken_on}`} loading="lazy" />
            </button>
            {editId === p.id ? (
              <div className={styles.editRow}>
                <input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
                <input
                  type="text"
                  placeholder="Caption"
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                />
                <div className={styles.editButtons}>
                  <button type="button" onClick={() => saveEdit(p.id)} disabled={busyId === p.id}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditId(null)} disabled={busyId === p.id}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <figcaption>
                <span className={styles.date}>{p.taken_on}</span>
                {p.caption && <span className={styles.cap}> · {p.caption}</span>}
                <span className={styles.actions}>
                  <button type="button" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(p.id)} disabled={busyId === p.id}>
                    Delete
                  </button>
                </span>
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {openIndex !== null && (
        <ImageLightbox
          photos={lightboxPhotos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </>
  );
}
