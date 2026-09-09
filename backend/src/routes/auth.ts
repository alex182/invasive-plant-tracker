import { Router } from "express";
import { db } from "../db";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  cookieOptions,
  createSession,
  destroySession,
  destroySessionsForUser,
  requireAuth,
  SESSION_COOKIE,
  toAuthUser,
  type AuthedRequest,
} from "../lib/auth";

export const authRouter = Router();

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: "admin" | "user";
  display_name: string;
  active: number;
  must_change_password: number;
  created_at: string;
}

authRouter.post("/login", (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const row = db.prepare("SELECT * FROM user WHERE username = ?").get(username) as UserRow | undefined;
  if (!row || !row.active || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: "invalid username or password" });
    return;
  }

  const sessionId = createSession(row.id);
  res.cookie(SESSION_COOKIE, sessionId, cookieOptions());
  res.json(toAuthUser(row));
});

authRouter.post("/logout", requireAuth, (req: AuthedRequest, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) destroySession(token);
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json(req.user);
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
  res.json(toAuthUser(updated));
});
