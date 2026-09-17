import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { hashPassword } from "../lib/password";
import {
  createQrLoginToken,
  destroySessionsForUser,
  QR_TOKEN_MAX_TTL_MS,
  QR_TOKEN_MIN_TTL_MS,
  QR_TOKEN_NEVER_EXPIRES_AT,
  requireAdmin,
  requireAdminOrImpersonating,
  type AuthedRequest,
  type Role,
} from "../lib/auth";
import { recordAudit } from "../lib/audit";

export const usersRouter = Router();

const VALID_ROLES: readonly Role[] = ["admin", "user", "simplified"];

function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value);
}

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
  if (!isValidRole(role)) {
    res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(", ")}` });
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
    if (!isValidRole(body.role)) {
      res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(", ")}` });
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

/**
 * Resets this user's password to a freshly generated one and mints a short-lived, single-use token
 * that reveals it via POST /auth/login/qr: the admin displays it as a QR code (or shares the link)
 * and whoever scans it lands on the normal login page with that username/password filled in —
 * ready to submit, so the browser can offer to remember it, with no typing on a shared field
 * device. Like POST /users/:id/reset-password, this signs out the account's other active sessions.
 * `ttl_minutes` sets how long the token lasts unredeemed (default 10, clamped to
 * [min_ttl_minutes, max_ttl_minutes] in the response); pass 0 for a token that never expires.
 */
usersRouter.post("/:id/qr-login-token", requireAdmin, (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT id, active FROM user WHERE id = ?").get(req.params.id) as
    | { id: string; active: number }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  if (!existing.active) {
    res.status(409).json({ error: "can't create a login QR code for a deactivated user" });
    return;
  }

  const { ttl_minutes } = req.body ?? {};
  let ttlMs: number | undefined;
  if (ttl_minutes !== undefined) {
    if (typeof ttl_minutes !== "number" || !Number.isFinite(ttl_minutes) || ttl_minutes < 0) {
      res.status(400).json({ error: "ttl_minutes must be 0 (never expires) or a positive number" });
      return;
    }
    // 0 is the "never expires" opt-in — anything else is a normal, clamped minute count.
    ttlMs = ttl_minutes === 0 ? Infinity : ttl_minutes * 60 * 1000;
  }

  const { token, expiresAt } = createQrLoginToken(existing.id, req.user!.id, ttlMs);
  recordAudit(req, "user.qr_login_token_create", {
    targetType: "user",
    targetId: existing.id,
    detail: ttl_minutes === 0 ? "never expires" : null,
  });
  res.status(201).json({
    token,
    expires_at: expiresAt,
    never_expires: expiresAt === QR_TOKEN_NEVER_EXPIRES_AT,
    min_ttl_minutes: QR_TOKEN_MIN_TTL_MS / 60000,
    max_ttl_minutes: QR_TOKEN_MAX_TTL_MS / 60000,
  });
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

/**
 * Permanently deletes a user. Their plants aren't touched — ownership just clears to null, the
 * same "legacy" state a pre-accounts plant has — and their audit trail stays (actor_username /
 * actor_display_name are recorded on each entry separately), just with the link to this row
 * cleared. Deactivating is reversible and usually the better choice; this isn't.
 */
usersRouter.delete("/:id", requireAdmin, (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT id, username FROM user WHERE id = ?").get(req.params.id) as
    | { id: string; username: string }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  if (existing.id === req.user!.id) {
    res.status(400).json({ error: "you can't delete your own account" });
    return;
  }

  db.transaction(() => {
    db.prepare("UPDATE plant SET owner_id = NULL WHERE owner_id = ?").run(existing.id);
    db.prepare("UPDATE audit_log SET actor_id = NULL WHERE actor_id = ?").run(existing.id);
    db.prepare("UPDATE audit_log SET impersonated_by = NULL WHERE impersonated_by = ?").run(existing.id);
    db.prepare("UPDATE session SET impersonated_by = NULL WHERE impersonated_by = ?").run(existing.id);
    db.prepare("UPDATE login_qr_token SET created_by = NULL WHERE created_by = ?").run(existing.id);
    // session and login_qr_token rows *for* this user (not created by/impersonating as them) cascade on delete.
    db.prepare("DELETE FROM user WHERE id = ?").run(existing.id);
  })();

  recordAudit(req, "user.delete", { targetType: "user", targetId: existing.id, detail: existing.username });
  res.status(204).send();
});
