import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import type { AuthedRequest, AuthUser } from "../lib/auth";
import { recordAudit } from "../lib/audit";

export const treatmentsRouter = Router();

interface TreatmentRow {
  id: string;
  plant_id: string;
  date: string;
  method: string | null;
  herbicide: string | null;
  outcome: string | null;
  followup_due: string | null;
  followup_done: number;
  logged_by: string | null;
  created_at: string;
  updated_at: string;
}

function canMutate(user: AuthUser, ownerId: string | null): boolean {
  return user.role === "admin" || user.id === ownerId;
}

function plantOwner(plantId: string): { owner_id: string | null } | undefined {
  return db.prepare("SELECT owner_id FROM plant WHERE id = ?").get(plantId) as
    | { owner_id: string | null }
    | undefined;
}

function plantExists(plantId: string): boolean {
  return !!db.prepare("SELECT 1 FROM plant WHERE id = ?").get(plantId);
}

treatmentsRouter.get("/treatments", (_req, res) => {
  const rows = db.prepare("SELECT * FROM treatment ORDER BY date DESC").all();
  res.json(rows);
});

treatmentsRouter.get("/plants/:plantId/treatments", (req, res) => {
  if (!plantExists(req.params.plantId)) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM treatment WHERE plant_id = ? ORDER BY date DESC")
    .all(req.params.plantId);
  res.json(rows);
});

treatmentsRouter.post("/plants/:plantId/treatments", (req: AuthedRequest, res) => {
  const plant = plantOwner(req.params.plantId);
  if (!plant) {
    res.status(404).json({ error: "plant not found" });
    return;
  }
  if (!canMutate(req.user!, plant.owner_id)) {
    res.status(403).json({ error: "you can only log treatments on plants you own" });
    return;
  }

  const body = req.body ?? {};
  const { date, method = null, herbicide = null, outcome = null, followup_due = null } = body;

  if (typeof date !== "string" || !date) {
    res.status(400).json({ error: "date is required" });
    return;
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO treatment (id, plant_id, date, method, herbicide, outcome, followup_due, followup_done, logged_by, created_at, updated_at)
     VALUES (@id, @plant_id, @date, @method, @herbicide, @outcome, @followup_due, 0, @logged_by, @now, @now)`
  ).run({
    id,
    plant_id: req.params.plantId,
    date,
    method,
    herbicide,
    outcome,
    followup_due,
    logged_by: req.user!.display_name,
    now,
  });

  const row = db.prepare("SELECT * FROM treatment WHERE id = ?").get(id);
  recordAudit(req, "treatment.create", {
    targetType: "plant",
    targetId: req.params.plantId,
    detail: outcome || method || "treatment logged",
  });
  res.status(201).json(row);
});

treatmentsRouter.patch("/treatments/:id", (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM treatment WHERE id = ?").get(req.params.id) as
    | TreatmentRow
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "treatment not found" });
    return;
  }
  const plant = plantOwner(existing.plant_id);
  if (!plant || !canMutate(req.user!, plant.owner_id)) {
    res.status(403).json({ error: "you can only edit treatments on plants you own" });
    return;
  }

  const body = req.body ?? {};
  const updates: Record<string, unknown> = { ...existing };

  if (body.date !== undefined) updates.date = body.date;
  if (body.method !== undefined) updates.method = body.method;
  if (body.herbicide !== undefined) updates.herbicide = body.herbicide;
  if (body.outcome !== undefined) updates.outcome = body.outcome;
  if (body.followup_due !== undefined) updates.followup_due = body.followup_due;
  if (body.followup_done !== undefined) updates.followup_done = body.followup_done ? 1 : 0;

  updates.updated_at = new Date().toISOString();

  db.prepare(
    `UPDATE treatment SET date=@date, method=@method, herbicide=@herbicide, outcome=@outcome,
      followup_due=@followup_due, followup_done=@followup_done, updated_at=@updated_at WHERE id=@id`
  ).run(updates);

  const row = db.prepare("SELECT * FROM treatment WHERE id = ?").get(req.params.id);
  res.json(row);
});
