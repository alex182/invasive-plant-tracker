import { Router } from "express";
import { db } from "../db";

export const exportRouter = Router();

interface ExportRow {
  id: string;
  species_id: string;
  common_name: string;
  scientific_name: string;
  category: string;
  latitude: number;
  longitude: number;
  gps_accuracy_m: number | null;
  status: string;
  method: string | null;
  notes: string;
  date_identified: string;
  date_started: string | null;
  date_removed: string | null;
  geometry: string | null;
  created_at: string;
  updated_at: string;
}

function fetchRows(): ExportRow[] {
  return db
    .prepare(
      `SELECT p.id, p.species_id, s.common_name, s.scientific_name, s.category,
              p.latitude, p.longitude, p.gps_accuracy_m, p.status, p.method, p.notes,
              p.date_identified, p.date_started, p.date_removed, p.geometry, p.created_at, p.updated_at
       FROM plant p JOIN species s ON s.id = p.species_id
       ORDER BY p.created_at`
    )
    .all() as ExportRow[];
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

exportRouter.get("/csv", (_req, res) => {
  const rows = fetchRows();
  const headers = [
    "id",
    "common_name",
    "scientific_name",
    "category",
    "status",
    "latitude",
    "longitude",
    "gps_accuracy_m",
    "method",
    "notes",
    "date_identified",
    "date_started",
    "date_removed",
    "created_at",
    "updated_at",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.common_name,
        r.scientific_name,
        r.category,
        r.status,
        r.latitude,
        r.longitude,
        r.gps_accuracy_m,
        r.method,
        r.notes,
        r.date_identified,
        r.date_started,
        r.date_removed,
        r.created_at,
        r.updated_at,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="invasive-plants.csv"');
  res.send(lines.join("\n"));
});

/** GeoJSON polygons must close their ring (first vertex repeated at the end). Input is [lat, lng]; output is [lng, lat]. */
function closeRing(points: [number, number][]): [number, number][] {
  const ring = points.map(([lat, lng]) => [lng, lat] as [number, number]);
  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) ring.push(ring[0]);
  return ring;
}

exportRouter.get("/geojson", (_req, res) => {
  const rows = fetchRows();
  const featureCollection = {
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      geometry: r.geometry
        ? {
            type: "Polygon",
            coordinates: [closeRing(JSON.parse(r.geometry) as [number, number][])],
          }
        : { type: "Point", coordinates: [r.longitude, r.latitude] },
      properties: {
        id: r.id,
        common_name: r.common_name,
        scientific_name: r.scientific_name,
        category: r.category,
        status: r.status,
        gps_accuracy_m: r.gps_accuracy_m,
        method: r.method,
        notes: r.notes,
        date_identified: r.date_identified,
        date_started: r.date_started,
        date_removed: r.date_removed,
        created_at: r.created_at,
        updated_at: r.updated_at,
      },
    })),
  };
  res.setHeader("Content-Type", "application/geo+json");
  res.setHeader("Content-Disposition", 'attachment; filename="invasive-plants.geojson"');
  res.json(featureCollection);
});
