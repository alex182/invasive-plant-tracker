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

describe("monitoring status + regrowth", () => {
  it("accepts the monitoring status on create and patch", async () => {
    const request = (await import("supertest")).default;
    const speciesId = (await request(app).get("/api/species")).body[0].id;

    const created = await request(app)
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20", status: "monitoring" });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("monitoring");
    expect(created.body.date_started).toBeNull();

    const patched = await request(app).patch(`/api/plants/${created.body.id}`).send({ status: "monitoring" });
    expect(patched.status).toBe(200);
    expect(patched.body.date_started).toBeTruthy(); // auto-filled like "pending"
  });

  it("POST /:id/regrowth logs a treatment, reopens the plant, and clears the removal date", async () => {
    const request = (await import("supertest")).default;
    const speciesId = (await request(app).get("/api/species")).body[0].id;

    const created = await request(app)
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });
    await request(app).patch(`/api/plants/${created.body.id}`).send({ status: "removed" });

    const res = await request(app).post(`/api/plants/${created.body.id}/regrowth`).send({ logged_by: "Alex" });
    expect(res.status).toBe(201);
    expect(res.body.plant.status).toBe("pending");
    expect(res.body.plant.date_removed).toBeNull();
    expect(res.body.treatment.outcome).toBe("Regrowth found");
    expect(res.body.treatment.followup_due).toBeTruthy();
    expect(res.body.treatment.logged_by).toBe("Alex");

    const treatments = await request(app).get(`/api/plants/${created.body.id}/treatments`);
    expect(treatments.body.some((t: { outcome: string }) => t.outcome === "Regrowth found")).toBe(true);
  });

  it("regrowth on a missing plant returns 404", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).post("/api/plants/does-not-exist/regrowth").send({});
    expect(res.status).toBe(404);
  });
});

describe("attribution", () => {
  it("round-trips logged_by on a plant and a treatment", async () => {
    const request = (await import("supertest")).default;
    const speciesId = (await request(app).get("/api/species")).body[0].id;

    const created = await request(app)
      .post("/api/plants")
      .send({
        species_id: speciesId,
        latitude: 39.06,
        longitude: -94.88,
        date_identified: "2026-08-20",
        logged_by: "Sam",
      });
    expect(created.body.logged_by).toBe("Sam");

    const treatment = await request(app)
      .post(`/api/plants/${created.body.id}/treatments`)
      .send({ date: "2026-08-21", logged_by: "Sam" });
    expect(treatment.status).toBe(201);
    expect(treatment.body.logged_by).toBe("Sam");
  });
});

describe("plant photos", () => {
  it("uploads, lists, and deletes photos; primary photo tracks the newest", async () => {
    const request = (await import("supertest")).default;
    const speciesId = (await request(app).get("/api/species")).body[0].id;
    const plant = await request(app)
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });
    const plantId = plant.body.id;

    const older = await request(app)
      .post(`/api/plants/${plantId}/photos`)
      .field("taken_on", "2025-01-01")
      .attach("photo", Buffer.from("img-a"), "a.jpg");
    expect(older.status).toBe(201);

    const newer = await request(app)
      .post(`/api/plants/${plantId}/photos`)
      .field("taken_on", "2026-06-01")
      .field("caption", "after cut-stump")
      .attach("photo", Buffer.from("img-b"), "b.jpg");
    expect(newer.status).toBe(201);
    expect(newer.body.caption).toBe("after cut-stump");

    const list = await request(app).get(`/api/plants/${plantId}/photos`);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].taken_on).toBe("2025-01-01"); // ordered ascending

    const plantAfter = await request(app).get(`/api/plants/${plantId}`);
    expect(plantAfter.body.photo_path).toBe(newer.body.path); // newest is primary

    const del = await request(app).delete(`/api/photos/${newer.body.id}`);
    expect(del.status).toBe(204);

    const plantAfterDelete = await request(app).get(`/api/plants/${plantId}`);
    expect(plantAfterDelete.body.photo_path).toBe(older.body.path); // falls back to the remaining photo
  });

  it("rejects a treatment_id that belongs to another plant", async () => {
    const request = (await import("supertest")).default;
    const speciesId = (await request(app).get("/api/species")).body[0].id;
    const p1 = await request(app)
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });
    const p2 = await request(app)
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.07, longitude: -94.89, date_identified: "2026-08-20" });
    const t = await request(app).post(`/api/plants/${p2.body.id}/treatments`).send({ date: "2026-08-21" });

    const res = await request(app)
      .post(`/api/plants/${p1.body.id}/photos`)
      .field("treatment_id", t.body.id)
      .attach("photo", Buffer.from("img"), "x.jpg");
    expect(res.status).toBe(400);
  });

  it("the legacy singular photo route still works", async () => {
    const request = (await import("supertest")).default;
    const speciesId = (await request(app).get("/api/species")).body[0].id;
    const plant = await request(app)
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });

    const res = await request(app)
      .post(`/api/plants/${plant.body.id}/photo`)
      .attach("photo", Buffer.from("legacy"), "legacy.jpg");
    expect(res.status).toBe(200);
    expect(res.body.photo_path).toBeTruthy();

    const list = await request(app).get(`/api/plants/${plant.body.id}/photos`);
    expect(list.body).toHaveLength(1);
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
    expect(res.text.split("\n")[0]).toContain("photo_count");
    expect(res.text.split("\n")[0]).toContain("logged_by");
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

describe("identify", () => {
  it("returns 503 when PLANTNET_API_KEY is not configured", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app)
      .post("/api/identify")
      .attach("photo", Buffer.from("fake-image-bytes"), "leaf.jpg");
    expect(res.status).toBe(503);
  });

  it("GET /api/identify/settings reports no key by default", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).get("/api/identify/settings");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hasKey: false, keyFromEnv: false, project: "all" });
  });

  it("rejects a blank API key", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).put("/api/identify/settings").send({ apiKey: "   " });
    expect(res.status).toBe(400);
  });

  it("saves an API key and project, reports hasKey without leaking the key, then clears it", async () => {
    const request = (await import("supertest")).default;
    const put = await request(app)
      .put("/api/identify/settings")
      .send({ apiKey: "2b10secretkey", project: "k-world-flora" });
    expect(put.status).toBe(200);
    expect(put.body).toEqual({ hasKey: true, keyFromEnv: false, project: "k-world-flora" });

    const get = await request(app).get("/api/identify/settings");
    expect(get.body.hasKey).toBe(true);
    expect(JSON.stringify(get.body)).not.toContain("2b10secretkey");

    const cleared = await request(app)
      .put("/api/identify/settings")
      .send({ apiKey: "", project: "" });
    expect(cleared.body).toEqual({ hasKey: false, keyFromEnv: false, project: "all" });
  });
});

describe("ntfy settings", () => {
  it("defaults to ntfy.sh with no topic and no token", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).get("/api/ntfy/settings");
    expect(res.status).toBe(200);
    expect(res.body.server).toBe("https://ntfy.sh");
    expect(res.body.hasToken).toBe(false);
  });

  it("rejects an invalid server URL", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).put("/api/ntfy/settings").send({ server: "not-a-url", topic: "my-topic" });
    expect(res.status).toBe(400);
  });

  it("rejects a topic with invalid characters", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app)
      .put("/api/ntfy/settings")
      .send({ server: "https://ntfy.sh", topic: "has a space" });
    expect(res.status).toBe(400);
  });

  it("saves valid settings and a token, then reports hasToken without leaking it", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app)
      .put("/api/ntfy/settings")
      .send({ server: "https://ntfy.sh", topic: "my-topic", token: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ server: "https://ntfy.sh", topic: "my-topic", hasToken: true });

    const getRes = await request(app).get("/api/ntfy/settings");
    expect(getRes.body.hasToken).toBe(true);
    expect(JSON.stringify(getRes.body)).not.toContain("secret123");
  });

  it("test endpoint requires a topic", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).post("/api/ntfy/test").send({ server: "https://ntfy.sh" });
    expect(res.status).toBe(400);
  });
});
