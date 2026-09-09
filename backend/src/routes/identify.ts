import { Router } from "express";
import multer from "multer";
import { getSetting, setSetting, deleteSetting } from "../lib/settings";
import { requireAdmin } from "../lib/auth";

export const identifyRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/** Stored Settings value wins over the server env var, so the key can be managed from the UI. */
function getApiKey(): string | null {
  return getSetting("plantnet_api_key") || process.env.PLANTNET_API_KEY || null;
}

function getProject(): string {
  return getSetting("plantnet_project") || process.env.PLANTNET_PROJECT || "all";
}

interface PlantNetSpecies {
  scientificNameWithoutAuthor?: string;
  scientificName?: string;
  commonNames?: string[];
}

interface PlantNetResult {
  score: number;
  species?: PlantNetSpecies;
}

interface PlantNetResponse {
  results?: PlantNetResult[];
}

identifyRouter.get("/settings", requireAdmin, (_req, res) => {
  res.json({
    hasKey: Boolean(getApiKey()),
    keyFromEnv: !getSetting("plantnet_api_key") && Boolean(process.env.PLANTNET_API_KEY),
    project: getProject(),
  });
});

identifyRouter.put("/settings", requireAdmin, (req, res) => {
  const { apiKey, project } = req.body ?? {};

  if (apiKey === "") {
    deleteSetting("plantnet_api_key");
  } else if (typeof apiKey === "string") {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      res.status(400).json({ error: "apiKey must not be blank" });
      return;
    }
    setSetting("plantnet_api_key", trimmed);
  }
  // apiKey === undefined leaves any existing stored key untouched.

  if (project === "") {
    deleteSetting("plantnet_project");
  } else if (typeof project === "string") {
    setSetting("plantnet_project", project.trim());
  }

  res.json({
    hasKey: Boolean(getApiKey()),
    keyFromEnv: !getSetting("plantnet_api_key") && Boolean(process.env.PLANTNET_API_KEY),
    project: getProject(),
  });
});

identifyRouter.post("/", upload.single("photo"), async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: "Plant identification is not configured on this server." });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "photo file is required (field name 'photo')" });
    return;
  }

  const form = new FormData();
  form.append(
    "images",
    new Blob([req.file.buffer], { type: req.file.mimetype }),
    req.file.originalname || "photo.jpg"
  );
  form.append("organs", "auto");

  const url = `https://my-api.plantnet.org/v2/identify/${encodeURIComponent(getProject())}?api-key=${encodeURIComponent(apiKey)}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, { method: "POST", body: form });
  } catch {
    res.status(502).json({ error: "Couldn't reach the plant identification service." });
    return;
  }

  if (!upstream.ok) {
    if (upstream.status === 429) {
      res.status(429).json({ error: "Plant identification quota exceeded for today. Try again tomorrow." });
      return;
    }
    res.status(502).json({ error: `Plant identification service returned an error (${upstream.status}).` });
    return;
  }

  const data = (await upstream.json()) as PlantNetResponse;
  const results = (data.results ?? []).slice(0, 5).map((r) => ({
    scientific_name: r.species?.scientificNameWithoutAuthor ?? r.species?.scientificName ?? "Unknown",
    common_names: r.species?.commonNames ?? [],
    score: r.score,
  }));

  res.json({ results });
});
