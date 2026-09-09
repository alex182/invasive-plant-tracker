import { randomUUID } from "node:crypto";
import { db } from "../db";
import type { AuthedRequest } from "./auth";

/** Records an action taken by the authenticated (possibly impersonating) user on `req`. */
export function recordAudit(
  req: AuthedRequest,
  action: string,
  opts?: { targetType?: string; targetId?: string | null; detail?: string | null }
): void {
  if (!req.user) return;
  db.prepare(
    `INSERT INTO audit_log (id, actor_id, actor_username, actor_display_name, impersonated_by, action, target_type, target_id, detail, created_at)
     VALUES (@id, @actor_id, @actor_username, @actor_display_name, @impersonated_by, @action, @target_type, @target_id, @detail, @now)`
  ).run({
    id: randomUUID(),
    actor_id: req.user.id,
    actor_username: req.user.username,
    actor_display_name: req.user.display_name,
    impersonated_by: req.impersonation?.id ?? null,
    action,
    target_type: opts?.targetType ?? null,
    target_id: opts?.targetId ?? null,
    detail: opts?.detail ?? null,
    now: new Date().toISOString(),
  });
}

/** Records a pre-authentication event (e.g. a failed login) where there's no session yet. */
export function recordAuditUnauthenticated(action: string, detail: string | null, actorUsername: string | null): void {
  db.prepare(
    `INSERT INTO audit_log (id, actor_id, actor_username, actor_display_name, impersonated_by, action, target_type, target_id, detail, created_at)
     VALUES (@id, NULL, @actor_username, NULL, NULL, @action, NULL, NULL, @detail, @now)`
  ).run({
    id: randomUUID(),
    actor_username: actorUsername,
    action,
    detail,
    now: new Date().toISOString(),
  });
}
