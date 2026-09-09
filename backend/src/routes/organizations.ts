import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import type { AuthedRequest } from "../lib/auth";
import { recordAudit } from "../lib/audit";

export const organizationsRouter = Router();

interface OrgRow {
  id: string;
  name: string;
  created_at: string;
}

interface MemberRow {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "user";
  active: number;
}

function orgWithMembers(org: OrgRow) {
  const members = db
    .prepare(
      "SELECT id, username, display_name, role, active FROM user WHERE org_id = ? ORDER BY display_name COLLATE NOCASE ASC"
    )
    .all(org.id) as MemberRow[];
  return { ...org, members };
}

organizationsRouter.get("/", (_req, res) => {
  const orgs = db.prepare("SELECT * FROM organization ORDER BY name COLLATE NOCASE ASC").all() as OrgRow[];
  res.json(orgs.map(orgWithMembers));
});

organizationsRouter.post("/", (req: AuthedRequest, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const id = randomUUID();
  db.prepare("INSERT INTO organization (id, name, created_at) VALUES (?, ?, datetime('now'))").run(id, name.trim());

  const org = db.prepare("SELECT * FROM organization WHERE id = ?").get(id) as OrgRow;
  recordAudit(req, "org.create", { targetType: "organization", targetId: id, detail: name.trim() });
  res.status(201).json(orgWithMembers(org));
});

organizationsRouter.patch("/:id", (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM organization WHERE id = ?").get(req.params.id) as OrgRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "organization not found" });
    return;
  }

  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  db.prepare("UPDATE organization SET name = ? WHERE id = ?").run(name.trim(), req.params.id);
  const org = db.prepare("SELECT * FROM organization WHERE id = ?").get(req.params.id) as OrgRow;
  recordAudit(req, "org.rename", {
    targetType: "organization",
    targetId: req.params.id,
    detail: `${existing.name} → ${name.trim()}`,
  });
  res.json(orgWithMembers(org));
});

organizationsRouter.delete("/:id", (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM organization WHERE id = ?").get(req.params.id) as OrgRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "organization not found" });
    return;
  }

  // Members keep their plants but lose the shared access the org gave them.
  db.transaction(() => {
    db.prepare("UPDATE user SET org_id = NULL WHERE org_id = ?").run(req.params.id);
    db.prepare("DELETE FROM organization WHERE id = ?").run(req.params.id);
  })();

  recordAudit(req, "org.delete", { targetType: "organization", targetId: req.params.id, detail: existing.name });
  res.status(204).send();
});

organizationsRouter.post("/:id/members", (req: AuthedRequest, res) => {
  const org = db.prepare("SELECT * FROM organization WHERE id = ?").get(req.params.id) as OrgRow | undefined;
  if (!org) {
    res.status(404).json({ error: "organization not found" });
    return;
  }

  const { user_id } = req.body ?? {};
  if (typeof user_id !== "string" || !user_id) {
    res.status(400).json({ error: "user_id is required" });
    return;
  }

  const user = db.prepare("SELECT id, display_name, org_id FROM user WHERE id = ?").get(user_id) as
    | { id: string; display_name: string; org_id: string | null }
    | undefined;
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  if (user.org_id === req.params.id) {
    res.status(409).json({ error: "user is already in this organization" });
    return;
  }

  db.prepare("UPDATE user SET org_id = ? WHERE id = ?").run(req.params.id, user_id);
  // Auth reads org_id fresh from the user row on every request, so access reflects this at once;
  // the member just needs to reload the app for the client-side "my plants" filter to catch up.

  recordAudit(req, "org.add_member", {
    targetType: "organization",
    targetId: req.params.id,
    detail: `${user.display_name} → ${org.name}`,
  });
  res.status(201).json(orgWithMembers(org));
});

organizationsRouter.delete("/:id/members/:userId", (req: AuthedRequest, res) => {
  const org = db.prepare("SELECT * FROM organization WHERE id = ?").get(req.params.id) as OrgRow | undefined;
  if (!org) {
    res.status(404).json({ error: "organization not found" });
    return;
  }

  const user = db.prepare("SELECT id, display_name, org_id FROM user WHERE id = ?").get(req.params.userId) as
    | { id: string; display_name: string; org_id: string | null }
    | undefined;
  if (!user || user.org_id !== req.params.id) {
    res.status(404).json({ error: "user is not in this organization" });
    return;
  }

  db.prepare("UPDATE user SET org_id = NULL WHERE id = ?").run(req.params.userId);

  recordAudit(req, "org.remove_member", {
    targetType: "organization",
    targetId: req.params.id,
    detail: `${user.display_name} removed from ${org.name}`,
  });
  res.json(orgWithMembers(org));
});
