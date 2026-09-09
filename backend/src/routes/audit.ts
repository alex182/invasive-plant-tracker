import { Router } from "express";
import { db } from "../db";

export const auditRouter = Router();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

auditRouter.get("/", (req, res) => {
  const { before, actor_id, action, limit: limitParam } = req.query;

  let limit = DEFAULT_LIMIT;
  if (limitParam !== undefined) {
    const parsed = Number(limitParam);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      res.status(400).json({ error: `limit must be an integer between 1 and ${MAX_LIMIT}` });
      return;
    }
    limit = parsed;
  }

  const clauses: string[] = [];
  const params: Record<string, unknown> = { limit };

  if (before !== undefined) {
    if (typeof before !== "string" || !before) {
      res.status(400).json({ error: "before must be a non-empty string" });
      return;
    }
    clauses.push("a.created_at < @before");
    params.before = before;
  }

  if (actor_id !== undefined) {
    if (typeof actor_id !== "string" || !actor_id) {
      res.status(400).json({ error: "actor_id must be a non-empty string" });
      return;
    }
    clauses.push("a.actor_id = @actor_id");
    params.actor_id = actor_id;
  }

  if (action !== undefined) {
    if (typeof action !== "string" || !action) {
      res.status(400).json({ error: "action must be a non-empty string" });
      return;
    }
    clauses.push("a.action = @action");
    params.action = action;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT a.id, a.actor_id, a.actor_username, a.actor_display_name, a.impersonated_by,
              u.display_name AS impersonated_by_display_name,
              a.action, a.target_type, a.target_id, a.detail, a.created_at
       FROM audit_log a
       LEFT JOIN user u ON u.id = a.impersonated_by
       ${where}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT @limit`
    )
    .all(params);

  res.json({ entries: rows, next_before: rows.length === limit ? (rows[rows.length - 1] as { created_at: string }).created_at : null });
});
