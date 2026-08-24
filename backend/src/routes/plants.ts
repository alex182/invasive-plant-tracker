import { Router } from "express";
import { randomUUID } from "node:crypto";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { db } from "../db";

export const plantsRouter = Router();

const STATUSES = ["planned", "pending", "removed"] as const;
type Status = (typeof STATUSES)[number];

interface PlantRow {
  id: string;
  species_id: string;
  latitude: number;
  longitude: number;
  gps_accuracy_m: number | null;
  status: Status;
  method: string | null;
  notes: string;
  photo_path: string | null;
  date_identified: string;
  date_started: string | null;
  date_removed: string | null;
  geometry: string | null;
  created_at: string;
  updated_at: string;
}

function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** A patch outline: null (no outline), or 3+ [lat, lng] vertices. */
function isValidGeometry(geometry: unknown): geometry is [number, number][] | null {
  if (geometry === null || geometry === undefined) return true;
  if (!Array.isArray(geometry) || geometry.length < 3) return false;
  return geometry.every(
    (point) => Array.isArray(point) && point.length === 2 && isValidLatLng(point[0], point[1])
  );
}

function serialize(row: PlantRow) {
  return { ...row, geometry: row.geometry ? JSON.parse(row.geometry) : null };
}

function speciesExists(speciesId: string): boolean {
  const row = db.prepare("SELECT 1 FROM species WHERE id = ?").get(speciesId);
  return !!row;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

plantsRouter.get("/", (req, res) => {
  const { status, species_id } = req.query;
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (status !== undefined) {
    if (typeof status !== "string" || !STATUSES.includes(status as Status)) {
      res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
      return;
    }
    clauses.push("status = @status");
    params.status = status;
  }

  if (species_id !== undefined) {
    if (typeof species_id !== "string") {
      res.status(400).json({ error: "species_id must be a string" });
      return;
    }
    clauses.push("species_id = @species_id");
    params.species_id = species_id;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM plant ${where} ORDER BY updated_at DESC`).all(params) as PlantRow[];
  res.json(rows.map(serialize));
});

plantsRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow | undefined;
  if (!row) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  res.json(serialize(row));
});

plantsRouter.post("/", (req, res) => {
  const body = req.body ?? {};
  const {
    species_id,
    latitude,
    longitude,
    gps_accuracy_m = null,
    status = "planned",
    method = null,
    notes = "",
    date_identified,
    date_started = null,
    date_removed = null,
    geometry = null,
  } = body;

  if (typeof species_id !== "string" || !speciesExists(species_id)) {
    res.status(400).json({ error: "species_id must reference an existing species" });
    return;
  }
  if (!isValidLatLng(latitude, longitude)) {
    res.status(400).json({ error: "latitude/longitude must be valid numbers in range" });
    return;
  }
  if (!STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
    return;
  }
  if (typeof date_identified !== "string" || !date_identified) {
    res.status(400).json({ error: "date_identified is required" });
    return;
  }
  if (!isValidGeometry(geometry)) {
    res.status(400).json({ error: "geometry must be null or an array of 3+ [lat, lng] pairs" });
    return;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const geometryJson = geometry ? JSON.stringify(geometry) : null;

  db.prepare(
    `INSERT INTO plant (id, species_id, latitude, longitude, gps_accuracy_m, status, method, notes, date_identified, date_started, date_removed, geometry, created_at, updated_at)
     VALUES (@id, @species_id, @latitude, @longitude, @gps_accuracy_m, @status, @method, @notes, @date_identified, @date_started, @date_removed, @geometry, @now, @now)`
  ).run({
    id,
    species_id,
    latitude,
    longitude,
    gps_accuracy_m,
    status,
    method,
    notes,
    date_identified,
    date_started,
    date_removed,
    geometry: geometryJson,
    now,
  });

  const row = db.prepare("SELECT * FROM plant WHERE id = ?").get(id) as PlantRow;
  res.status(201).json(serialize(row));
});

plantsRouter.patch("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "plant not found" });
    return;
  }

  const body = req.body ?? {};
  const updates: Record<string, unknown> = { ...existing };

  if (body.species_id !== undefined) {
    if (typeof body.species_id !== "string" || !speciesExists(body.species_id)) {
      res.status(400).json({ error: "species_id must reference an existing species" });
      return;
    }
    updates.species_id = body.species_id;
  }

  if (body.latitude !== undefined || body.longitude !== undefined) {
    const lat = body.latitude ?? existing.latitude;
    const lng = body.longitude ?? existing.longitude;
    if (!isValidLatLng(lat, lng)) {
      res.status(400).json({ error: "latitude/longitude must be valid numbers in range" });
      return;
    }
    updates.latitude = lat;
    updates.longitude = lng;
  }

  if (body.geometry !== undefined) {
    if (!isValidGeometry(body.geometry)) {
      res.status(400).json({ error: "geometry must be null or an array of 3+ [lat, lng] pairs" });
      return;
    }
    updates.geometry = body.geometry ? JSON.stringify(body.geometry) : null;
  }

  if (body.gps_accuracy_m !== undefined) updates.gps_accuracy_m = body.gps_accuracy_m;
  if (body.method !== undefined) updates.method = body.method;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.date_identified !== undefined) updates.date_identified = body.date_identified;
  if (body.date_started !== undefined) updates.date_started = body.date_started;
  if (body.date_removed !== undefined) updates.date_removed = body.date_removed;

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
      return;
    }
    updates.status = body.status;

    // T3.2: sensible date auto-fill on status transitions.
    if (body.status === "pending" && !updates.date_started) {
      updates.date_started = todayISO();
    }
    if (body.status === "removed" && !updates.date_removed) {
      updates.date_removed = todayISO();
    }
  }

  updates.updated_at = new Date().toISOString();

  db.prepare(
    `UPDATE plant SET species_id=@species_id, latitude=@latitude, longitude=@longitude, gps_accuracy_m=@gps_accuracy_m,
      status=@status, method=@method, notes=@notes, date_identified=@date_identified, date_started=@date_started,
      date_removed=@date_removed, geometry=@geometry, updated_at=@updated_at WHERE id=@id`
  ).run(updates);

  const row = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow;
  res.json(serialize(row));
});

plantsRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM plant WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  res.status(204).send();
});

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

plantsRouter.post("/:id/photo", upload.single("photo"), (req, res) => {
  const existing = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "photo file is required (field name 'photo')" });
    return;
  }

  const photoPath = `/uploads/${req.file.filename}`;
  db.prepare("UPDATE plant SET photo_path = ?, updated_at = ? WHERE id = ?").run(
    photoPath,
    new Date().toISOString(),
    req.params.id
  );

  const row = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow;
  res.json(serialize(row));
});
