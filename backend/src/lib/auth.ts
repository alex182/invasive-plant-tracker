import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db";
import { generateTempPassword, hashPassword } from "./password";

/** "simplified" can only identify + add a plant — no editing, no listing/browsing, nothing to revisit. */
export type Role = "admin" | "user" | "simplified";

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  display_name: string;
  must_change_password: boolean;
  /** The organization this user belongs to, or null. Members of the same org share plants. */
  org_id: string | null;
  /** Display name of that organization, or null when the user isn't in one. */
  org_name: string | null;
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
  org_id: string | null;
  created_at: string;
}

export const SESSION_COOKIE = "ipt_session";
// Effectively indefinite: sessions used to expire (and log people out) after 30 days of inactivity,
// which meant re-scanning a login QR code or re-typing a password periodically. For the shared/kid
// devices this app targets, that's pure friction with no real security payoff — someone who could
// still use the device already had access. A century is "doesn't expire" without needing a separate
// no-expiry code path; explicit admin actions (deactivate, reset password, delete, log out) still
// revoke a session immediately regardless of this TTL.
const SESSION_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000;
const RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function cookieOptions(): { httpOnly: true; sameSite: "lax"; secure: boolean; path: string; maxAge: number } {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Without this, the cookie itself is a browser "session cookie" — cleared when the browser
    // fully closes — regardless of how long the server-side session record is good for. Matching
    // it to SESSION_TTL_MS is what actually makes login survive closing the app/browser or
    // restarting the device, not just staying open in one tab.
    maxAge: SESSION_TTL_MS,
  };
}

export function toAuthUser(row: UserRow): AuthUser {
  const org = row.org_id
    ? (db.prepare("SELECT name FROM organization WHERE id = ?").get(row.org_id) as { name: string } | undefined)
    : undefined;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    display_name: row.display_name,
    must_change_password: Boolean(row.must_change_password),
    org_id: row.org_id ?? null,
    org_name: org?.name ?? null,
  };
}

/**
 * Whether `user` may edit/delete a plant owned by `ownerId`: admins can touch anything, you can
 * always touch your own, and members of the same organization share each other's plants.
 */
export function canMutatePlant(user: AuthUser, ownerId: string | null): boolean {
  if (user.role === "admin") return true;
  if (!ownerId) return false;
  if (user.id === ownerId) return true;
  if (!user.org_id) return false;
  const owner = db.prepare("SELECT org_id FROM user WHERE id = ?").get(ownerId) as
    | { org_id: string | null }
    | undefined;
  return !!owner && owner.org_id === user.org_id;
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
      // julianday(...) rather than a plain string compare against datetime('now') — expires_at is
      // stored as an ISO string (2026-09-17T13:39:49.779Z) but datetime('now') renders with a space
      // instead of 'T' (2026-09-17 13:40:49); on the same calendar day 'T' (0x54) sorts after ' '
      // (0x20), so a naive `expires_at > datetime('now')` reads every same-day expiry as still valid.
      `SELECT u.*, s.created_at AS session_created_at, s.impersonated_by AS session_impersonated_by
       FROM session s JOIN user u ON u.id = s.user_id
       WHERE s.id = ? AND julianday(s.expires_at) > julianday('now') AND u.active = 1`
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

/**
 * Blocks the "simplified" role from everything except identifying + creating a plant and seeing
 * plants on the map (that one's GET /plants, not gated here): editing plants, opening a plant's own
 * detail page, logging treatments, managing photos after the fact, exporting, etc. A simplified
 * account is meant to have no such routes reachable from its own UI at all — this is the
 * server-side backstop against someone calling them directly anyway.
 */
export function requireNotSimplified(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role === "simplified") {
    res.status(403).json({ error: "simplified accounts can only identify and add a plant" });
    return;
  }
  next();
}

export function sweepExpiredSessions(): void {
  db.prepare("DELETE FROM session WHERE julianday(expires_at) < julianday('now')").run();
}

export const QR_TOKEN_DEFAULT_TTL_MS = 10 * 60 * 1000;
export const QR_TOKEN_MIN_TTL_MS = 60 * 1000;
export const QR_TOKEN_MAX_TTL_MS = 24 * 60 * 60 * 1000;
/** expires_at stored for a QR token minted with ttlMs === Infinity — effectively "never". */
export const QR_TOKEN_NEVER_EXPIRES_AT = "9999-12-31T23:59:59.999Z";

function hashQrToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Plaintext passwords for outstanding QR login tokens, keyed by token hash. Kept only in memory
 * (never written to disk) — a token is only ever exchanged once, right after it's minted, so this
 * just bridges the moment between "admin generates the code" and "device scans it". A server
 * restart in between just makes the code act expired, same as if its TTL had passed.
 */
const qrLoginPlaintext = new Map<string, string>();

/**
 * Admin-only: resets the given user's password to a freshly generated one and mints a single-use
 * token that reveals it via POST /auth/login/qr — this is what the "login with QR code" flow puts
 * into the QR image. The token itself only unlocks the (hashed-at-rest) password once; the
 * password keeps working for ordinary logins afterward, same as any admin-issued reset, until it's
 * reset again. `ttlMs` (how long the token lasts unredeemed) is clamped to
 * [QR_TOKEN_MIN_TTL_MS, QR_TOKEN_MAX_TTL_MS] — pass Infinity for a token that never expires.
 */
export function createQrLoginToken(
  userId: string,
  createdBy: string,
  ttlMs: number = QR_TOKEN_DEFAULT_TTL_MS
): { token: string; expiresAt: string; username: string } {
  const user = db.prepare("SELECT username FROM user WHERE id = ?").get(userId) as { username: string } | undefined;
  if (!user) throw new Error("createQrLoginToken: user not found");

  const password = generateTempPassword();
  db.prepare("UPDATE user SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(
    hashPassword(password),
    userId
  );
  destroySessionsForUser(userId);

  const expiresAt =
    ttlMs === Infinity
      ? QR_TOKEN_NEVER_EXPIRES_AT
      : new Date(Date.now() + Math.min(Math.max(ttlMs, QR_TOKEN_MIN_TTL_MS), QR_TOKEN_MAX_TTL_MS)).toISOString();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashQrToken(token);
  db.prepare(
    "INSERT INTO login_qr_token (id, user_id, token_hash, created_by, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), userId, tokenHash, createdBy, expiresAt);
  qrLoginPlaintext.set(tokenHash, password);

  return { token, expiresAt, username: user.username };
}

/**
 * Redeems a QR login token once, handing back the plain-text username/password it was minted for
 * so the frontend can fill in and submit the normal login form. Returns null if the token is
 * invalid, expired, already used, or the account's been deactivated since.
 */
export function redeemQrLoginToken(token: string): { username: string; password: string } | null {
  const tokenHash = hashQrToken(token);
  // julianday(...) rather than a plain string compare — see the comment on requireAuth's session
  // lookup for why `expires_at > datetime('now')` is wrong for a same-day expiry.
  const tokenRow = db
    .prepare(
      "SELECT id, user_id FROM login_qr_token WHERE token_hash = ? AND used_at IS NULL AND julianday(expires_at) > julianday('now')"
    )
    .get(tokenHash) as { id: string; user_id: string } | undefined;
  if (!tokenRow) return null;

  const password = qrLoginPlaintext.get(tokenHash);
  if (!password) return null;

  const user = db.prepare("SELECT username, active FROM user WHERE id = ?").get(tokenRow.user_id) as
    | { username: string; active: number }
    | undefined;
  if (!user || !user.active) return null;

  db.prepare("UPDATE login_qr_token SET used_at = datetime('now') WHERE id = ?").run(tokenRow.id);
  qrLoginPlaintext.delete(tokenHash);
  return { username: user.username, password };
}

export function sweepExpiredQrTokens(): void {
  const expired = db
    .prepare("SELECT token_hash FROM login_qr_token WHERE julianday(expires_at) < julianday('now')")
    .all() as { token_hash: string }[];
  for (const row of expired) qrLoginPlaintext.delete(row.token_hash);
  db.prepare("DELETE FROM login_qr_token WHERE julianday(expires_at) < julianday('now')").run();
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
