import { Router } from "express";
import { getSetting, setSetting, deleteSetting } from "../lib/settings";

export const ntfyRouter = Router();

/** Validates the server is a plain http(s) URL and strips any trailing slash. */
function normalizeServer(server: string): string | null {
  try {
    const url = new URL(server);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return server.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

const TOPIC_RE = /^[A-Za-z0-9_-]+$/;

ntfyRouter.get("/settings", (_req, res) => {
  res.json({
    server: getSetting("ntfy_server") ?? "https://ntfy.sh",
    topic: getSetting("ntfy_topic") ?? "",
    hasToken: Boolean(getSetting("ntfy_token")),
  });
});

ntfyRouter.put("/settings", (req, res) => {
  const { server, topic, token } = req.body ?? {};

  const normalizedServer = typeof server === "string" ? normalizeServer(server) : null;
  if (!normalizedServer) {
    res.status(400).json({ error: "server must be a valid http(s) URL" });
    return;
  }
  if (typeof topic !== "string" || !TOPIC_RE.test(topic)) {
    res.status(400).json({ error: "topic must be letters, numbers, - or _ only" });
    return;
  }

  setSetting("ntfy_server", normalizedServer);
  setSetting("ntfy_topic", topic);

  if (token === "") {
    deleteSetting("ntfy_token");
  } else if (typeof token === "string") {
    setSetting("ntfy_token", token);
  }
  // token === undefined leaves any existing stored token untouched.

  res.json({
    server: getSetting("ntfy_server"),
    topic: getSetting("ntfy_topic"),
    hasToken: Boolean(getSetting("ntfy_token")),
  });
});

interface TestBody {
  server?: string;
  topic?: string;
  token?: string;
  useSaved?: boolean;
}

ntfyRouter.post("/test", async (req, res) => {
  const body = (req.body ?? {}) as TestBody;

  const server = body.useSaved ? getSetting("ntfy_server") : body.server;
  const topic = body.useSaved ? getSetting("ntfy_topic") : body.topic;
  const token = body.useSaved ? getSetting("ntfy_token") : body.token;

  const normalizedServer = typeof server === "string" ? normalizeServer(server) : null;
  if (!normalizedServer) {
    res.status(400).json({ error: "server must be a valid http(s) URL" });
    return;
  }
  if (typeof topic !== "string" || !topic) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  const url = `${normalizedServer}/${encodeURIComponent(topic)}`;
  const headers: Record<string, string> = {
    Title: "Invasive Plant Tracker",
    Tags: "seedling,white_check_mark",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: "Test notification from Invasive Plant Tracker — if you see this, follow-up reminders are wired up correctly.",
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      res.status(502).json({ error: `ntfy server returned ${upstream.status}`, detail: text.slice(0, 300) });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: "Couldn't reach the ntfy server.", detail: err instanceof Error ? err.message : undefined });
  }
});
