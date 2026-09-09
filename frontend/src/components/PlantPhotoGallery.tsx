import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { ImageLightbox, type LightboxPhoto } from "./ImageLightbox";
import type { PhotoPhase, PlantPhoto } from "../types";
import styles from "./PlantPhotoGallery.module.css";

const PHASE_ORDER: PhotoPhase[] = ["before", "during", "after"];
const PHASE_LABEL: Record<PhotoPhase, string> = { before: "Before", during: "During", after: "After" };

export function PlantPhotoGallery({
  photos,
  speciesLabel,
  onChanged,
  /** Group the photos under Before / During / After headings and allow editing a photo's stage. */
  grouped = false,
}: {
  photos: PlantPhoto[];
  speciesLabel: string;
  /** Called after a photo is edited or deleted so the parent can refetch. */
  onChanged: () => void;
  grouped?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftPhase, setDraftPhase] = useState<PhotoPhase | "">("");

  // Photos in the order they're shown (and so the order the lightbox pages through).
  const ordered = useMemo(() => {
    if (!grouped) return photos;
    const rank = (p: PlantPhoto) => (p.phase ? PHASE_ORDER.indexOf(p.phase) : PHASE_ORDER.length);
    return [...photos].sort((a, b) => rank(a) - rank(b) || a.taken_on.localeCompare(b.taken_on));
  }, [photos, grouped]);

  if (photos.length === 0) return null;

  const lightboxPhotos: LightboxPhoto[] = ordered.map((p) => ({
    url: p.path,
    alt: `${speciesLabel} — ${p.taken_on}`,
    caption: [p.phase ? PHASE_LABEL[p.phase] : "", p.taken_on, p.caption].filter(Boolean).join(" · "),
  }));

  function startEdit(p: PlantPhoto) {
    setEditId(p.id);
    setDraftCaption(p.caption);
    setDraftDate(p.taken_on);
    setDraftPhase(p.phase ?? "");
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    try {
      await api.photos.update(id, {
        caption: draftCaption,
        taken_on: draftDate,
        ...(grouped ? { phase: draftPhase || null } : {}),
      });
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

  function renderItem(p: PlantPhoto) {
    const i = ordered.indexOf(p);
    return (
      <figure key={p.id} className={styles.item}>
        <button type="button" className={styles.imageButton} onClick={() => setOpenIndex(i)}>
          <img src={p.path} alt={`${speciesLabel} ${p.taken_on}`} loading="lazy" />
        </button>
        {editId === p.id ? (
          <div className={styles.editRow}>
            <input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
            {grouped && (
              <select value={draftPhase} onChange={(e) => setDraftPhase(e.target.value as PhotoPhase | "")}>
                <option value="">No stage</option>
                {PHASE_ORDER.map((ph) => (
                  <option key={ph} value={ph}>
                    {PHASE_LABEL[ph]}
                  </option>
                ))}
              </select>
            )}
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
            {!grouped && p.phase && <span className={styles.phaseBadge}>{PHASE_LABEL[p.phase]}</span>}
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
    );
  }

  return (
    <>
      {grouped ? (
        [...PHASE_ORDER, null].map((ph) => {
          const inGroup = ordered.filter((p) => (p.phase ?? null) === ph);
          if (inGroup.length === 0) return null;
          return (
            <div key={ph ?? "none"} className={styles.group}>
              <h3 className={styles.groupHeading}>{ph ? PHASE_LABEL[ph] : "Unsorted"}</h3>
              <div className={styles.gallery}>{inGroup.map(renderItem)}</div>
            </div>
          );
        })
      ) : (
        <div className={styles.gallery}>{ordered.map(renderItem)}</div>
      )}

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
