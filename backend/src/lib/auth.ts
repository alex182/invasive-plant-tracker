import { randomBytes, randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db";
import { hashPassword } from "./password";

export type Role = "admin" | "user";

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  display_name: string;
  must_change_password: boolean;
}

export interface ImpersonatorInfo {
  id: string;
  username: string;
  display_name: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
  /** The real admin behind the current session, if it's an impersonation session. */
  impersonation?: ImpersonatorInfo | null;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: Role;
  display_name: string;
  active: number;
  must_change_password: number;
  created_at: string;
}

export const SESSION_COOKIE = "ipt_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function cookieOptions(): { httpOnly: true; sameSite: "lax"; secure: boolean; path: string } {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    display_name: row.display_name,
    must_change_password: Boolean(row.must_change_password),
  };
}

export function createSession(userId: string, impersonatedBy: string | null = null): string {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO session (id, user_id, expires_at, impersonated_by) VALUES (?, ?, ?, ?)").run(
    id,
    userId,
    expiresAt,
    impersonatedBy
  );
  return id;
}

export function destroySession(sessionId: string): void {
  db.prepare("DELETE FROM session WHERE id = ?").run(sessionId);
}

export function destroySessionsForUser(userId: string): void {
  db.prepare("DELETE FROM session WHERE user_id = ?").run(userId);
}

function renewSessionIfStale(sessionId: string, createdAt: string): void {
  const age = Date.now() - new Date(createdAt).getTime();
  if (age < RENEW_THRESHOLD_MS) return;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("UPDATE session SET expires_at = ? WHERE id = ?").run(expiresAt, sessionId);
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    res.status(401).json({ error: "authentication required" });
    return;
  }

  const row = db
    .prepare(
      `SELECT u.*, s.created_at AS session_created_at, s.impersonated_by AS session_impersonated_by
       FROM session s JOIN user u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now') AND u.active = 1`
    )
    .get(token) as (UserRow & { session_created_at: string; session_impersonated_by: string | null }) | undefined;

  if (!row) {
    res.status(401).json({ error: "authentication required" });
    return;
  }

  renewSessionIfStale(token, row.session_created_at);
  req.user = toAuthUser(row);
  req.impersonation = row.session_impersonated_by
    ? (db
        .prepare("SELECT id, username, display_name FROM user WHERE id = ?")
        .get(row.session_impersonated_by) as ImpersonatorInfo | undefined) ?? null
    : null;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "admin access required" });
    return;
  }
  next();
}

/**
 * Like requireAdmin, but also lets an impersonation session through — req.impersonation is only
 * ever set on a session an admin created via POST /auth/impersonate, so the real actor is still
 * provably an admin even though the effective role (req.user.role) is whoever they're viewing as.
 */
export function requireAdminOrImpersonating(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin" && !req.impersonation) {
    res.status(403).json({ error: "admin access required" });
    return;
  }
  next();
}

export function sweepExpiredSessions(): void {
  db.prepare("DELETE FROM session WHERE expires_at < datetime('now')").run();
}

/** No-op once any user exists. Creates the first admin account and assigns pre-existing plants to it. */
export function bootstrapAdmin(): void {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM user").get() as { n: number };
  if (n > 0) return;

  const username = process.env.ADMIN_USERNAME || "admin";
  const generatedPassword = randomBytes(9).toString("base64url");
  const password = process.env.ADMIN_PASSWORD || generatedPassword;
  const id = randomUUID();
  const mustChangePassword = process.env.ADMIN_PASSWORD ? 0 : 1;

  db.transaction(() => {
    db.prepare(
      `INSERT INTO user (id, username, password_hash, role, display_name, active, must_change_password, created_at)
       VALUES (?, ?, ?, 'admin', ?, 1, ?, datetime('now'))`
    ).run(id, username, hashPassword(password), username, mustChangePassword);
    db.prepare("UPDATE plant SET owner_id = ? WHERE owner_id IS NULL").run(id);
  })();

  if (process.env.ADMIN_PASSWORD) {
    console.log(`[bootstrap] Created admin user "${username}" from ADMIN_PASSWORD.`);
  } else {
    console.log(
      `\n[bootstrap] Created admin user "${username}" with generated password: ${password}\n` +
        `[bootstrap] This is shown once. Log in and change it, or set ADMIN_PASSWORD and restart to reset it.\n`
    );
  }
}
