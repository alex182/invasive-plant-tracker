import { Router } from "express";
import multer from "multer";

export const identifyRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PLANTNET_API_KEY = process.env.PLANTNET_API_KEY;
const PLANTNET_PROJECT = process.env.PLANTNET_PROJECT || "all";

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

identifyRouter.post("/", upload.single("photo"), async (req, res) => {
  if (!PLANTNET_API_KEY) {
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

  const url = `https://my-api.plantnet.org/v2/identify/${encodeURIComponent(PLANTNET_PROJECT)}?api-key=${encodeURIComponent(PLANTNET_API_KEY)}`;

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
