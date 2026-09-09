import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { upload, removeUploadedFile } from "../lib/uploads";
import { insertPlantPhoto } from "./photos";
import { requireAdmin, type AuthedRequest, type AuthUser } from "../lib/auth";
import { recordAudit } from "../lib/audit";

export const plantsRouter = Router();

const STATUSES = ["planned", "pending", "monitoring", "removed"] as const;
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
  logged_by: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

function canMutate(user: AuthUser, ownerId: string | null): boolean {
  return user.role === "admin" || user.id === ownerId;
}

function userExists(id: string): boolean {
  return !!db.prepare("SELECT 1 FROM user WHERE id = ?").get(id);
}

function getUser(id: string): { id: string; display_name: string } | undefined {
  return db.prepare("SELECT id, display_name FROM user WHERE id = ?").get(id) as
    | { id: string; display_name: string }
    | undefined;
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

function speciesName(speciesId: string): string | null {
  const row = db.prepare("SELECT common_name FROM species WHERE id = ?").get(speciesId) as
    | { common_name: string }
    | undefined;
  return row?.common_name ?? null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const EARTH_RADIUS_M = 6371000;
/** Same species logged within this distance of each other are treated as likely duplicates. */
const DUPLICATE_DISTANCE_M = 15;

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Union-find over a user's own plants: clusters same-species plants within DUPLICATE_DISTANCE_M of each other. */
function findDuplicateGroups(plants: PlantRow[]): PlantRow[][] {
  const parent = plants.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < plants.length; i++) {
    for (let j = i + 1; j < plants.length; j++) {
      if (plants[i].species_id !== plants[j].species_id) continue;
      if (haversineMeters(plants[i].latitude, plants[i].longitude, plants[j].latitude, plants[j].longitude) <= DUPLICATE_DISTANCE_M) {
        union(i, j);
      }
    }
  }

  const clusters = new Map<number, PlantRow[]>();
  for (let i = 0; i < plants.length; i++) {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(plants[i]);
  }
  return [...clusters.values()].filter((group) => group.length >= 2);
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

/**
 * Groups of the current user's own plants that are the same species and within
 * DUPLICATE_DISTANCE_M of each other — likely accidental double-entries.
 */
plantsRouter.get("/duplicates", (req: AuthedRequest, res) => {
  const rows = db
    .prepare("SELECT * FROM plant WHERE owner_id = ? ORDER BY created_at ASC")
    .all(req.user!.id) as PlantRow[];

  const groups = findDuplicateGroups(rows).map((group) => ({
    species_id: group[0].species_id,
    species_name: speciesName(group[0].species_id),
    plants: group.map(serialize),
  }));

  res.json({ groups });
});

plantsRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow | undefined;
  if (!row) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  res.json(serialize(row));
});

plantsRouter.post("/", (req: AuthedRequest, res) => {
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
    `INSERT INTO plant (id, species_id, latitude, longitude, gps_accuracy_m, status, method, notes, date_identified, date_started, date_removed, geometry, logged_by, owner_id, created_at, updated_at)
     VALUES (@id, @species_id, @latitude, @longitude, @gps_accuracy_m, @status, @method, @notes, @date_identified, @date_started, @date_removed, @geometry, @logged_by, @owner_id, @now, @now)`
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
    logged_by: req.user!.display_name,
    owner_id: req.user!.id,
    now,
  });

  const row = db.prepare("SELECT * FROM plant WHERE id = ?").get(id) as PlantRow;
  recordAudit(req, "plant.create", { targetType: "plant", targetId: id, detail: speciesName(species_id) });
  res.status(201).json(serialize(row));
});

plantsRouter.patch("/:id", (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  if (!canMutate(req.user!, existing.owner_id)) {
    res.status(403).json({ error: "you can only edit plants you own" });
    return;
  }

  const body = req.body ?? {};
  const updates: Record<string, unknown> = { ...existing };

  if (req.user!.role === "admin" && body.owner_id !== undefined) {
    if (typeof body.owner_id !== "string" || !userExists(body.owner_id)) {
      res.status(400).json({ error: "owner_id must reference an existing user" });
      return;
    }
    updates.owner_id = body.owner_id;
  }

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
    if ((body.status === "pending" || body.status === "monitoring") && !updates.date_started) {
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
      date_removed=@date_removed, geometry=@geometry, owner_id=@owner_id, updated_at=@updated_at WHERE id=@id`
  ).run(updates);

  const changes: string[] = [];
  if (updates.status !== existing.status) changes.push(`status: ${existing.status} → ${updates.status}`);
  if (updates.owner_id !== existing.owner_id) changes.push("owner reassigned");
  if (updates.species_id !== existing.species_id) changes.push("species changed");
  if (Object.keys(body).some((k) => ["latitude", "longitude", "geometry"].includes(k))) changes.push("location edited");
  if (body.notes !== undefined && body.notes !== existing.notes) changes.push("notes edited");

  const row = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow;
  recordAudit(req, "plant.update", { targetType: "plant", targetId: req.params.id, detail: changes.join(", ") || "details edited" });
  res.json(serialize(row));
});

/** Reassign many plants to a single owner at once. Admin only. */
plantsRouter.post("/bulk-reassign", requireAdmin, (req: AuthedRequest, res) => {
  const { plant_ids, owner_id } = req.body ?? {};

  if (!Array.isArray(plant_ids) || plant_ids.length === 0 || !plant_ids.every((id) => typeof id === "string")) {
    res.status(400).json({ error: "plant_ids must be a non-empty array of strings" });
    return;
  }
  if (typeof owner_id !== "string" || !userExists(owner_id)) {
    res.status(400).json({ error: "owner_id must reference an existing user" });
    return;
  }

  const now = new Date().toISOString();
  const update = db.prepare("UPDATE plant SET owner_id = @owner_id, updated_at = @now WHERE id = @id");
  const updated: string[] = [];
  db.transaction(() => {
    for (const id of plant_ids as string[]) {
      const result = update.run({ owner_id, now, id });
      if (result.changes > 0) updated.push(id);
    }
  })();

  recordAudit(req, "plant.bulk_reassign", {
    targetType: "user",
    targetId: owner_id,
    detail: `${updated.length} plant(s)`,
  });
  res.json({ updated_count: updated.length, updated_ids: updated });
});

/**
 * Duplicate plants onto another user's account: each source plant is left untouched and a new,
 * independent plant row (own id, no treatments/photos) is created for the target owner. Admin only.
 */
plantsRouter.post("/bulk-copy", requireAdmin, (req: AuthedRequest, res) => {
  const { plant_ids, owner_id } = req.body ?? {};

  if (!Array.isArray(plant_ids) || plant_ids.length === 0 || !plant_ids.every((id) => typeof id === "string")) {
    res.status(400).json({ error: "plant_ids must be a non-empty array of strings" });
    return;
  }
  const owner = typeof owner_id === "string" ? getUser(owner_id) : undefined;
  if (!owner) {
    res.status(400).json({ error: "owner_id must reference an existing user" });
    return;
  }

  const insert = db.prepare(
    `INSERT INTO plant (id, species_id, latitude, longitude, gps_accuracy_m, status, method, notes, date_identified, date_started, date_removed, geometry, logged_by, owner_id, created_at, updated_at)
     VALUES (@id, @species_id, @latitude, @longitude, @gps_accuracy_m, @status, @method, @notes, @date_identified, @date_started, @date_removed, @geometry, @logged_by, @owner_id, @now, @now)`
  );
  const created: string[] = [];
  db.transaction(() => {
    for (const sourceId of plant_ids as string[]) {
      const source = db.prepare("SELECT * FROM plant WHERE id = ?").get(sourceId) as PlantRow | undefined;
      if (!source) continue;
      const id = randomUUID();
      const now = new Date().toISOString();
      insert.run({
        id,
        species_id: source.species_id,
        latitude: source.latitude,
        longitude: source.longitude,
        gps_accuracy_m: source.gps_accuracy_m,
        status: source.status,
        method: source.method,
        notes: source.notes,
        date_identified: source.date_identified,
        date_started: source.date_started,
        date_removed: source.date_removed,
        geometry: source.geometry,
        logged_by: owner.display_name,
        owner_id: owner.id,
        now,
      });
      created.push(id);
    }
  })();

  recordAudit(req, "plant.bulk_copy", {
    targetType: "user",
    targetId: owner.id,
    detail: `${created.length} plant(s)`,
  });
  res.status(201).json({ created_count: created.length, created_ids: created });
});

plantsRouter.delete("/:id", (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT owner_id FROM plant WHERE id = ?").get(req.params.id) as
    | { owner_id: string | null }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  if (!canMutate(req.user!, existing.owner_id)) {
    res.status(403).json({ error: "you can only delete plants you own" });
    return;
  }

  const photoPaths = db
    .prepare("SELECT path FROM plant_photo WHERE plant_id = ?")
    .all(req.params.id) as { path: string }[];
  db.prepare("DELETE FROM plant WHERE id = ?").run(req.params.id);
  // plant_photo rows cascade-delete; clean up the files they referenced.
  for (const { path } of photoPaths) removeUploadedFile(path);
  recordAudit(req, "plant.delete", { targetType: "plant", targetId: req.params.id });
  res.status(204).send();
});

/**
 * Reopen a plant when regrowth is spotted: logs a "Regrowth found" treatment with a fresh
 * follow-up, flips status back to in-progress, and clears the removal date.
 */
plantsRouter.post("/:id/regrowth", (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  if (!canMutate(req.user!, existing.owner_id)) {
    res.status(403).json({ error: "you can only log regrowth on plants you own" });
    return;
  }

  const loggedBy = req.user!.display_name;
  const today = todayISO();
  const followup = new Date();
  followup.setDate(followup.getDate() + 120);
  const followupDue = followup.toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const treatmentId = randomUUID();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO treatment (id, plant_id, date, method, herbicide, outcome, followup_due, followup_done, logged_by, created_at, updated_at)
       VALUES (@id, @plant_id, @date, NULL, NULL, 'Regrowth found', @followup_due, 0, @logged_by, @now, @now)`
    ).run({ id: treatmentId, plant_id: req.params.id, date: today, followup_due: followupDue, logged_by: loggedBy, now });

    db.prepare("UPDATE plant SET status = 'pending', date_removed = NULL, updated_at = ? WHERE id = ?").run(
      now,
      req.params.id
    );
  })();

  const plant = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow;
  const treatment = db.prepare("SELECT * FROM treatment WHERE id = ?").get(treatmentId);
  recordAudit(req, "plant.regrowth", { targetType: "plant", targetId: req.params.id });
  res.status(201).json({ plant: serialize(plant), treatment });
});

plantsRouter.post("/:id/photo", upload.single("photo"), (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  if (!canMutate(req.user!, existing.owner_id)) {
    res.status(403).json({ error: "you can only add photos to plants you own" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "photo file is required (field name 'photo')" });
    return;
  }

  insertPlantPhoto({ plantId: req.params.id, path: `/uploads/${req.file.filename}` });

  const row = db.prepare("SELECT * FROM plant WHERE id = ?").get(req.params.id) as PlantRow;
  res.json(serialize(row));
});
