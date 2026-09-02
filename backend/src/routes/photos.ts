import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { upload, removeUploadedFile } from "../lib/uploads";

export const photosRouter = Router();

interface PhotoRow {
  id: string;
  plant_id: string;
  treatment_id: string | null;
  path: string;
  caption: string;
  taken_on: string;
  created_at: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plantExists(id: string): boolean {
  return !!db.prepare("SELECT 1 FROM plant WHERE id = ?").get(id);
}

function treatmentBelongsToPlant(treatmentId: string, plantId: string): boolean {
  return !!db.prepare("SELECT 1 FROM treatment WHERE id = ? AND plant_id = ?").get(treatmentId, plantId);
}

/** Point plant.photo_path at the most recent photo (or null) so map/list thumbnails keep working. */
export function refreshPrimaryPhoto(plantId: string): void {
  const latest = db
    .prepare("SELECT path FROM plant_photo WHERE plant_id = ? ORDER BY taken_on DESC, created_at DESC LIMIT 1")
    .get(plantId) as { path: string } | undefined;
  db.prepare("UPDATE plant SET photo_path = ?, updated_at = ? WHERE id = ?").run(
    latest ? latest.path : null,
    new Date().toISOString(),
    plantId
  );
}

/** Insert a plant_photo row and refresh the plant's primary photo. Returns the new row. */
export function insertPlantPhoto(args: {
  plantId: string;
  path: string;
  caption?: string;
  takenOn?: string;
  treatmentId?: string | null;
}): PhotoRow {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO plant_photo (id, plant_id, treatment_id, path, caption, taken_on, created_at)
     VALUES (@id, @plant_id, @treatment_id, @path, @caption, @taken_on, @created_at)`
  ).run({
    id,
    plant_id: args.plantId,
    treatment_id: args.treatmentId ?? null,
    path: args.path,
    caption: args.caption ?? "",
    taken_on: args.takenOn || todayISO(),
    created_at: new Date().toISOString(),
  });
  refreshPrimaryPhoto(args.plantId);
  return db.prepare("SELECT * FROM plant_photo WHERE id = ?").get(id) as PhotoRow;
}

photosRouter.get("/plants/:id/photos", (req, res) => {
  if (!plantExists(req.params.id)) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM plant_photo WHERE plant_id = ? ORDER BY taken_on ASC, created_at ASC")
    .all(req.params.id);
  res.json(rows);
});

photosRouter.post("/plants/:id/photos", upload.single("photo"), (req, res) => {
  if (!plantExists(req.params.id)) {
    if (req.file) removeUploadedFile(`/uploads/${req.file.filename}`);
    res.status(404).json({ error: "plant not found" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "photo file is required (field name 'photo')" });
    return;
  }

  const { caption, taken_on, treatment_id } = req.body ?? {};
  const treatmentId = treatment_id != null && treatment_id !== "" ? String(treatment_id) : null;

  if (treatmentId && !treatmentBelongsToPlant(treatmentId, req.params.id)) {
    removeUploadedFile(`/uploads/${req.file.filename}`);
    res.status(400).json({ error: "treatment_id must reference a treatment on this plant" });
    return;
  }

  const photo = insertPlantPhoto({
    plantId: req.params.id,
    path: `/uploads/${req.file.filename}`,
    caption: typeof caption === "string" ? caption : "",
    takenOn: typeof taken_on === "string" && taken_on ? taken_on : undefined,
    treatmentId,
  });
  res.status(201).json(photo);
});

photosRouter.patch("/photos/:photoId", (req, res) => {
  const existing = db.prepare("SELECT * FROM plant_photo WHERE id = ?").get(req.params.photoId) as
    | PhotoRow
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "photo not found" });
    return;
  }

  const body = req.body ?? {};
  const updates = {
    caption: existing.caption,
    taken_on: existing.taken_on,
    treatment_id: existing.treatment_id as string | null,
  };
  if (body.caption !== undefined) updates.caption = String(body.caption);
  if (body.taken_on !== undefined) updates.taken_on = String(body.taken_on);
  if (body.treatment_id !== undefined) {
    if (body.treatment_id === null || body.treatment_id === "") {
      updates.treatment_id = null;
    } else if (treatmentBelongsToPlant(String(body.treatment_id), existing.plant_id)) {
      updates.treatment_id = String(body.treatment_id);
    } else {
      res.status(400).json({ error: "treatment_id must reference a treatment on this plant" });
      return;
    }
  }

  db.prepare(
    "UPDATE plant_photo SET caption = @caption, taken_on = @taken_on, treatment_id = @treatment_id WHERE id = @id"
  ).run({ ...updates, id: req.params.photoId });
  refreshPrimaryPhoto(existing.plant_id);
  res.json(db.prepare("SELECT * FROM plant_photo WHERE id = ?").get(req.params.photoId));
});

photosRouter.delete("/photos/:photoId", (req, res) => {
  const existing = db.prepare("SELECT * FROM plant_photo WHERE id = ?").get(req.params.photoId) as
    | PhotoRow
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "photo not found" });
    return;
  }
  db.prepare("DELETE FROM plant_photo WHERE id = ?").run(req.params.photoId);
  removeUploadedFile(existing.path);
  refreshPrimaryPhoto(existing.plant_id);
  res.status(204).send();
});
