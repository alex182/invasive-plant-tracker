import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { hashPassword } from "../lib/password";
import { destroySessionsForUser, requireAdmin, requireAdminOrImpersonating, type AuthedRequest, type Role } from "../lib/auth";
import { recordAudit } from "../lib/audit";

export const usersRouter = Router();

interface UserRow {
  id: string;
  username: string;
  role: Role;
  display_name: string;
  active: number;
  must_change_password: number;
  org_id: string | null;
  created_at: string;
}

const PUBLIC_COLUMNS = "id, username, role, display_name, active, must_change_password, org_id, created_at";

function usernameTaken(username: string, excludeId?: string): boolean {
  const row = excludeId
    ? db.prepare("SELECT 1 FROM user WHERE username = ? AND id != ?").get(username, excludeId)
    : db.prepare("SELECT 1 FROM user WHERE username = ?").get(username);
  return !!row;
}

// Listing is also allowed during impersonation, so an admin can pick a target user for the
// bulk-copy action without having to stop impersonating first. Everything else stays admin-only.
usersRouter.get("/", requireAdminOrImpersonating, (_req, res) => {
  const rows = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM user ORDER BY created_at ASC`).all();
  res.json(rows);
});

usersRouter.post("/", requireAdmin, (req: AuthedRequest, res) => {
  const body = req.body ?? {};
  const { username, password, role, display_name } = body;

  if (typeof username !== "string" || !username.trim()) {
    res.status(400).json({ error: "username is required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters" });
    return;
  }
  if (role !== "admin" && role !== "user") {
    res.status(400).json({ error: "role must be 'admin' or 'user'" });
    return;
  }
  if (typeof display_name !== "string" || !display_name.trim()) {
    res.status(400).json({ error: "display_name is required" });
    return;
  }
  if (usernameTaken(username.trim())) {
    res.status(409).json({ error: "username is already taken" });
    return;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO user (id, username, password_hash, role, display_name, active, must_change_password, created_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, datetime('now'))`
  ).run(id, username.trim(), hashPassword(password), role, display_name.trim());

  const row = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM user WHERE id = ?`).get(id);
  recordAudit(req, "user.create", { targetType: "user", targetId: id, detail: `${username.trim()} (${role})` });
  res.status(201).json(row);
});

usersRouter.patch("/:id", requireAdmin, (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM user WHERE id = ?").get(req.params.id) as UserRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "user not found" });
    return;
  }

  const body = req.body ?? {};
  const updates = {
    role: existing.role,
    display_name: existing.display_name,
    active: existing.active,
  };

  if (body.role !== undefined) {
    if (body.role !== "admin" && body.role !== "user") {
      res.status(400).json({ error: "role must be 'admin' or 'user'" });
      return;
    }
    updates.role = body.role;
  }

  if (body.display_name !== undefined) {
    if (typeof body.display_name !== "string" || !body.display_name.trim()) {
      res.status(400).json({ error: "display_name must not be blank" });
      return;
    }
    updates.display_name = body.display_name.trim();
  }

  if (body.active !== undefined) {
    updates.active = body.active ? 1 : 0;
  }

  db.prepare("UPDATE user SET role = ?, display_name = ?, active = ? WHERE id = ?").run(
    updates.role,
    updates.display_name,
    updates.active,
    req.params.id
  );

  if (updates.active === 0) {
    destroySessionsForUser(req.params.id);
  }

  const changes: string[] = [];
  if (updates.role !== existing.role) changes.push(`role: ${existing.role} → ${updates.role}`);
  if (updates.display_name !== existing.display_name) changes.push(`display name: ${existing.display_name} → ${updates.display_name}`);
  if (updates.active !== existing.active) changes.push(updates.active ? "reactivated" : "deactivated");

  const row = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM user WHERE id = ?`).get(req.params.id);
  recordAudit(req, "user.update", { targetType: "user", targetId: req.params.id, detail: changes.join(", ") || null });
  res.json(row);
});

usersRouter.post("/:id/reset-password", requireAdmin, (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT id FROM user WHERE id = ?").get(req.params.id) as { id: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: "user not found" });
    return;
  }

  const { newPassword } = req.body ?? {};
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "newPassword must be at least 8 characters" });
    return;
  }

  db.prepare("UPDATE user SET password_hash = ?, must_change_password = 1 WHERE id = ?").run(
    hashPassword(newPassword),
    req.params.id
  );
  destroySessionsForUser(req.params.id);

  const row = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM user WHERE id = ?`).get(req.params.id);
  recordAudit(req, "user.reset_password", { targetType: "user", targetId: req.params.id });
  res.json(row);
});
