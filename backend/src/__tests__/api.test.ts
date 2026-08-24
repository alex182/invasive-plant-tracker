import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ipt-test-"));
  process.env.DATA_DIR = tmpDir;
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ipt-uploads-"));
  const { createApp } = await import("../app");
  app = createApp();
});

describe("health", () => {
  it("GET /api/health returns 200", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("species", () => {
  it("GET /api/species returns seeded species", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).get("/api/species");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("common_name");
  });
});

describe("plants", () => {
  it("rejects invalid lat/long", async () => {
    const request = (await import("supertest")).default;
    const speciesRes = await request(app).get("/api/species");
    const speciesId = speciesRes.body[0].id;

    const res = await request(app)
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 999, longitude: -94.88, date_identified: "2026-08-20" });
    expect(res.status).toBe(400);
  });

  it("rejects unknown status", async () => {
    const request = (await import("supertest")).default;
    const speciesRes = await request(app).get("/api/species");
    const speciesId = speciesRes.body[0].id;

    const res = await request(app)
      .post("/api/plants")
      .send({
        species_id: speciesId,
        latitude: 39.06,
        longitude: -94.88,
        date_identified: "2026-08-20",
        status: "bogus",
      });
    expect(res.status).toBe(400);
  });

  it("full CRUD works", async () => {
    const request = (await import("supertest")).default;
    const speciesRes = await request(app).get("/api/species");
    const speciesId = speciesRes.body[0].id;

    const createRes = await request(app)
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    const getRes = await request(app).get(`/api/plants/${id}`);
    expect(getRes.status).toBe(200);

    const patchRes = await request(app).patch(`/api/plants/${id}`).send({ status: "removed" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.date_removed).toBeTruthy();

    const delRes = await request(app).delete(`/api/plants/${id}`);
    expect(delRes.status).toBe(204);
  });

  it("rejects a patch outline with fewer than 3 vertices", async () => {
    const request = (await import("supertest")).default;
    const speciesRes = await request(app).get("/api/species");
    const speciesId = speciesRes.body[0].id;

    const res = await request(app)
      .post("/api/plants")
      .send({
        species_id: speciesId,
        latitude: 39.06,
        longitude: -94.88,
        date_identified: "2026-08-20",
        geometry: [
          [39.06, -94.88],
          [39.061, -94.881],
        ],
      });
    expect(res.status).toBe(400);
  });

  it("creates and updates a patch with a polygon outline", async () => {
    const request = (await import("supertest")).default;
    const speciesRes = await request(app).get("/api/species");
    const speciesId = speciesRes.body[0].id;
    const geometry = [
      [39.06, -94.88],
      [39.061, -94.881],
      [39.059, -94.879],
    ];

    const createRes = await request(app)
      .post("/api/plants")
      .send({
        species_id: speciesId,
        latitude: 39.06,
        longitude: -94.88,
        date_identified: "2026-08-20",
        geometry,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.geometry).toEqual(geometry);

    const patchRes = await request(app).patch(`/api/plants/${createRes.body.id}`).send({ geometry: null });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.geometry).toBeNull();
  });
});

describe("export", () => {
  it("exports CSV with a header row and plant data", async () => {
    const request = (await import("supertest")).default;
    const speciesRes = await request(app).get("/api/species");
    const speciesId = speciesRes.body[0].id;
    await request(app)
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });

    const res = await request(app).get("/api/export/csv");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text.split("\n")[0]).toContain("common_name");
    expect(res.text.split("\n").length).toBeGreaterThan(1);
  });

  it("exports a valid GeoJSON FeatureCollection", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).get("/api/export/geojson");
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("FeatureCollection");
    expect(Array.isArray(res.body.features)).toBe(true);
    expect(res.body.features[0].geometry.type).toBe("Point");
  });

  it("exports a patch outline as a closed GeoJSON Polygon", async () => {
    const request = (await import("supertest")).default;
    const speciesRes = await request(app).get("/api/species");
    const speciesId = speciesRes.body[0].id;
    const created = await request(app)
      .post("/api/plants")
      .send({
        species_id: speciesId,
        latitude: 39.06,
        longitude: -94.88,
        date_identified: "2026-08-20",
        geometry: [
          [39.06, -94.88],
          [39.061, -94.881],
          [39.059, -94.879],
        ],
      });

    const res = await request(app).get("/api/export/geojson");
    const feature = res.body.features.find((f: { properties: { id: string } }) => f.properties.id === created.body.id);
    expect(feature.geometry.type).toBe("Polygon");
    const ring = feature.geometry.coordinates[0];
    expect(ring.length).toBe(4);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });
});
