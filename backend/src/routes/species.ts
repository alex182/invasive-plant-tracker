import { Router } from "express";
import { db } from "../db";

export const speciesRouter = Router();

interface SpeciesRow {
  id: string;
  common_name: string;
  scientific_name: string;
  category: string;
  id_summary: string;
  id_key_tell: string;
  removal_summary: string;
  best_timing: string;
  herbicide_notes: string;
  source_links: string;
  active_months: string;
  photos: string;
  lookalikes: string;
  removal_methods: string;
}

function serialize(row: SpeciesRow) {
  return {
    ...row,
    source_links: JSON.parse(row.source_links),
    active_months: JSON.parse(row.active_months),
    photos: JSON.parse(row.photos),
    lookalikes: JSON.parse(row.lookalikes),
    removal_methods: JSON.parse(row.removal_methods),
  };
}

speciesRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM species ORDER BY common_name").all() as SpeciesRow[];
  res.json(rows.map(serialize));
});

speciesRouter.get("/season-now", (req, res) => {
  const month = req.query.month !== undefined ? Number(req.query.month) : new Date().getMonth() + 1;
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    res.status(400).json({ error: "month must be an integer 1-12" });
    return;
  }
  const rows = db.prepare("SELECT * FROM species ORDER BY common_name").all() as SpeciesRow[];
  const inWindow = rows.map(serialize).filter((s) => (s.active_months as number[]).includes(month));
  res.json(inWindow);
});

speciesRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM species WHERE id = ?").get(req.params.id) as SpeciesRow | undefined;
  if (!row) {
    res.status(404).json({ error: "species not found" });
    return;
  }
  res.json(serialize(row));
});
