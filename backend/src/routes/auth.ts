import { Router } from "express";
import { db } from "../db";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  cookieOptions,
  createSession,
  destroySession,
  destroySessionsForUser,
  requireAdmin,
  requireAuth,
  SESSION_COOKIE,
  toAuthUser,
  type AuthedRequest,
  type AuthUser,
  type ImpersonatorInfo,
} from "../lib/auth";
import { recordAudit, recordAuditUnauthenticated } from "../lib/audit";

export const authRouter = Router();

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: "admin" | "user";
  display_name: string;
  active: number;
  must_change_password: number;
  org_id: string | null;
  created_at: string;
}

function withImpersonation(user: AuthUser, impersonation: ImpersonatorInfo | null) {
  return { ...user, impersonating: Boolean(impersonation), real_admin: impersonation };
}

authRouter.post("/login", (req: AuthedRequest, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const row = db.prepare("SELECT * FROM user WHERE username = ?").get(username) as UserRow | undefined;
  if (!row || !row.active || !verifyPassword(password, row.password_hash)) {
    recordAuditUnauthenticated("auth.login_failed", null, username);
    res.status(401).json({ error: "invalid username or password" });
    return;
  }

  const sessionId = createSession(row.id);
  res.cookie(SESSION_COOKIE, sessionId, cookieOptions());
  req.user = toAuthUser(row);
  recordAudit(req, "auth.login");
  res.json(withImpersonation(req.user, null));
});

authRouter.post("/logout", requireAuth, (req: AuthedRequest, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) destroySession(token);
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json(withImpersonation(req.user!, req.impersonation ?? null));
});

authRouter.post("/change-password", requireAuth, (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "currentPassword and a newPassword of at least 8 characters are required" });
    return;
  }

  const row = db.prepare("SELECT * FROM user WHERE id = ?").get(req.user!.id) as UserRow;
  if (!verifyPassword(currentPassword, row.password_hash)) {
    res.status(401).json({ error: "current password is incorrect" });
    return;
  }

  db.prepare("UPDATE user SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(
    hashPassword(newPassword),
    row.id
  );

  destroySessionsForUser(row.id);
  const sessionId = createSession(row.id);
  res.cookie(SESSION_COOKIE, sessionId, cookieOptions());

  const updated = db.prepare("SELECT * FROM user WHERE id = ?").get(row.id) as UserRow;
  recordAudit(req, "auth.change_password", { targetType: "user", targetId: row.id });
  res.json(withImpersonation(toAuthUser(updated), null));
});

/** Admin-only: switch the current session into acting as another user, for testing what they see. */
authRouter.post("/impersonate/:userId", requireAuth, requireAdmin, (req: AuthedRequest, res) => {
  if (req.impersonation) {
    res.status(400).json({ error: "already impersonating — stop first" });
    return;
  }
  if (req.params.userId === req.user!.id) {
    res.status(400).json({ error: "you can't impersonate yourself" });
    return;
  }

  const target = db.prepare("SELECT * FROM user WHERE id = ?").get(req.params.userId) as UserRow | undefined;
  if (!target || !target.active) {
    res.status(404).json({ error: "user not found" });
    return;
  }

  const sessionId = createSession(target.id, req.user!.id);
  res.cookie(SESSION_COOKIE, sessionId, cookieOptions());
  recordAudit(req, "auth.impersonate_start", { targetType: "user", targetId: target.id, detail: target.username });
  res.json(
    withImpersonation(toAuthUser(target), {
      id: req.user!.id,
      username: req.user!.username,
      display_name: req.user!.display_name,
    })
  );
});

authRouter.post("/stop-impersonating", requireAuth, (req: AuthedRequest, res) => {
  if (!req.impersonation) {
    res.status(400).json({ error: "not currently impersonating" });
    return;
  }

  const admin = db.prepare("SELECT * FROM user WHERE id = ?").get(req.impersonation.id) as UserRow | undefined;
  if (!admin || !admin.active) {
    res.status(409).json({ error: "the admin account is no longer available" });
    return;
  }

  recordAudit(req, "auth.impersonate_stop", { targetType: "user", targetId: req.user!.id, detail: req.user!.username });

  const token = req.cookies?.[SESSION_COOKIE];
  if (token) destroySession(token);
  const sessionId = createSession(admin.id);
  res.cookie(SESSION_COOKIE, sessionId, cookieOptions());
  res.json(withImpersonation(toAuthUser(admin), null));
});
