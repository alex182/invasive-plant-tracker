import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Express } from "express";
import supertest from "supertest";

const TEST_ADMIN_USERNAME = "test-admin";
const TEST_ADMIN_PASSWORD = "test-admin-password";

let app: Express;
let agent: ReturnType<typeof supertest.agent>;
let adminDisplayName: string;

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ipt-test-"));
  process.env.DATA_DIR = tmpDir;
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ipt-uploads-"));
  process.env.ADMIN_USERNAME = TEST_ADMIN_USERNAME;
  process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
  const { createApp } = await import("../app");
  app = createApp();
  agent = supertest.agent(app);
  const login = await agent
    .post("/api/auth/login")
    .send({ username: TEST_ADMIN_USERNAME, password: TEST_ADMIN_PASSWORD });
  adminDisplayName = login.body.display_name;
});

describe("health", () => {
  it("GET /api/health returns 200", async () => {
    const res = await agent.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("species", () => {
  it("GET /api/species returns seeded species", async () => {
    const res = await agent.get("/api/species");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("common_name");
  });
});

describe("plants", () => {
  it("rejects invalid lat/long", async () => {
    const speciesRes = await agent.get("/api/species");
    const speciesId = speciesRes.body[0].id;

    const res = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 999, longitude: -94.88, date_identified: "2026-08-20" });
    expect(res.status).toBe(400);
  });

  it("rejects unknown status", async () => {
    const speciesRes = await agent.get("/api/species");
    const speciesId = speciesRes.body[0].id;

    const res = await agent
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
    const speciesRes = await agent.get("/api/species");
    const speciesId = speciesRes.body[0].id;

    const createRes = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    const getRes = await agent.get(`/api/plants/${id}`);
    expect(getRes.status).toBe(200);

    const patchRes = await agent.patch(`/api/plants/${id}`).send({ status: "removed" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.date_removed).toBeTruthy();

    const delRes = await agent.delete(`/api/plants/${id}`);
    expect(delRes.status).toBe(204);
  });

  it("rejects a patch outline with fewer than 3 vertices", async () => {
    const speciesRes = await agent.get("/api/species");
    const speciesId = speciesRes.body[0].id;

    const res = await agent
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
    const speciesRes = await agent.get("/api/species");
    const speciesId = speciesRes.body[0].id;
    const geometry = [
      [39.06, -94.88],
      [39.061, -94.881],
      [39.059, -94.879],
    ];

    const createRes = await agent
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

    const patchRes = await agent.patch(`/api/plants/${createRes.body.id}`).send({ geometry: null });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.geometry).toBeNull();
  });
});

describe("monitoring status + regrowth", () => {
  it("accepts the monitoring status on create and patch", async () => {
    const speciesId = (await agent.get("/api/species")).body[0].id;

    const created = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20", status: "monitoring" });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("monitoring");
    expect(created.body.date_started).toBeNull();

    const patched = await agent.patch(`/api/plants/${created.body.id}`).send({ status: "monitoring" });
    expect(patched.status).toBe(200);
    expect(patched.body.date_started).toBeTruthy(); // auto-filled like "pending"
  });

  it("POST /:id/regrowth logs a treatment, reopens the plant, and clears the removal date", async () => {
    const speciesId = (await agent.get("/api/species")).body[0].id;

    const created = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });
    await agent.patch(`/api/plants/${created.body.id}`).send({ status: "removed" });

    const res = await agent.post(`/api/plants/${created.body.id}/regrowth`).send({ logged_by: "Alex" });
    expect(res.status).toBe(201);
    expect(res.body.plant.status).toBe("pending");
    expect(res.body.plant.date_removed).toBeNull();
    expect(res.body.treatment.outcome).toBe("Regrowth found");
    expect(res.body.treatment.followup_due).toBeTruthy();
    // logged_by is always the session user's display name, regardless of what the client sends.
    expect(res.body.treatment.logged_by).toBe(adminDisplayName);

    const treatments = await agent.get(`/api/plants/${created.body.id}/treatments`);
    expect(treatments.body.some((t: { outcome: string }) => t.outcome === "Regrowth found")).toBe(true);
  });

  it("regrowth on a missing plant returns 404", async () => {
    const res = await agent.post("/api/plants/does-not-exist/regrowth").send({});
    expect(res.status).toBe(404);
  });
});

describe("attribution", () => {
  it("stamps logged_by from the session user, ignoring any client-supplied value", async () => {
    const speciesId = (await agent.get("/api/species")).body[0].id;

    const created = await agent
      .post("/api/plants")
      .send({
        species_id: speciesId,
        latitude: 39.06,
        longitude: -94.88,
        date_identified: "2026-08-20",
        logged_by: "Sam",
      });
    expect(created.body.logged_by).toBe(adminDisplayName);
    expect(created.body.owner_id).toBeTruthy();

    const treatment = await agent
      .post(`/api/plants/${created.body.id}/treatments`)
      .send({ date: "2026-08-21", logged_by: "Sam" });
    expect(treatment.status).toBe(201);
    expect(treatment.body.logged_by).toBe(adminDisplayName);
  });
});

describe("plant photos", () => {
  it("uploads, lists, and deletes photos; primary photo tracks the newest", async () => {
    const speciesId = (await agent.get("/api/species")).body[0].id;
    const plant = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });
    const plantId = plant.body.id;

    const older = await agent
      .post(`/api/plants/${plantId}/photos`)
      .field("taken_on", "2025-01-01")
      .attach("photo", Buffer.from("img-a"), "a.jpg");
    expect(older.status).toBe(201);

    const newer = await agent
      .post(`/api/plants/${plantId}/photos`)
      .field("taken_on", "2026-06-01")
      .field("caption", "after cut-stump")
      .attach("photo", Buffer.from("img-b"), "b.jpg");
    expect(newer.status).toBe(201);
    expect(newer.body.caption).toBe("after cut-stump");

    const list = await agent.get(`/api/plants/${plantId}/photos`);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].taken_on).toBe("2025-01-01"); // ordered ascending

    const plantAfter = await agent.get(`/api/plants/${plantId}`);
    expect(plantAfter.body.photo_path).toBe(newer.body.path); // newest is primary

    const del = await agent.delete(`/api/photos/${newer.body.id}`);
    expect(del.status).toBe(204);

    const plantAfterDelete = await agent.get(`/api/plants/${plantId}`);
    expect(plantAfterDelete.body.photo_path).toBe(older.body.path); // falls back to the remaining photo
  });

  it("rejects a treatment_id that belongs to another plant", async () => {
    const speciesId = (await agent.get("/api/species")).body[0].id;
    const p1 = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });
    const p2 = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.07, longitude: -94.89, date_identified: "2026-08-20" });
    const t = await agent.post(`/api/plants/${p2.body.id}/treatments`).send({ date: "2026-08-21" });

    const res = await agent
      .post(`/api/plants/${p1.body.id}/photos`)
      .field("treatment_id", t.body.id)
      .attach("photo", Buffer.from("img"), "x.jpg");
    expect(res.status).toBe(400);
  });

  it("the legacy singular photo route still works", async () => {
    const speciesId = (await agent.get("/api/species")).body[0].id;
    const plant = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });

    const res = await agent
      .post(`/api/plants/${plant.body.id}/photo`)
      .attach("photo", Buffer.from("legacy"), "legacy.jpg");
    expect(res.status).toBe(200);
    expect(res.body.photo_path).toBeTruthy();

    const list = await agent.get(`/api/plants/${plant.body.id}/photos`);
    expect(list.body).toHaveLength(1);
  });
});

describe("export", () => {
  it("exports CSV with a header row and plant data", async () => {
    const speciesRes = await agent.get("/api/species");
    const speciesId = speciesRes.body[0].id;
    await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.06, longitude: -94.88, date_identified: "2026-08-20" });

    const res = await agent.get("/api/export/csv");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text.split("\n")[0]).toContain("common_name");
    expect(res.text.split("\n")[0]).toContain("photo_count");
    expect(res.text.split("\n")[0]).toContain("logged_by");
    expect(res.text.split("\n").length).toBeGreaterThan(1);
  });

  it("exports a valid GeoJSON FeatureCollection", async () => {
    const res = await agent.get("/api/export/geojson");
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("FeatureCollection");
    expect(Array.isArray(res.body.features)).toBe(true);
    expect(res.body.features[0].geometry.type).toBe("Point");
  });

  it("exports a patch outline as a closed GeoJSON Polygon", async () => {
    const speciesRes = await agent.get("/api/species");
    const speciesId = speciesRes.body[0].id;
    const created = await agent
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

    const res = await agent.get("/api/export/geojson");
    const feature = res.body.features.find((f: { properties: { id: string } }) => f.properties.id === created.body.id);
    expect(feature.geometry.type).toBe("Polygon");
    const ring = feature.geometry.coordinates[0];
    expect(ring.length).toBe(4);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });
});

describe("identify", () => {
  it("returns 503 when PLANTNET_API_KEY is not configured", async () => {
    const res = await agent
      .post("/api/identify")
      .attach("photo", Buffer.from("fake-image-bytes"), "leaf.jpg");
    expect(res.status).toBe(503);
  });

  it("GET /api/identify/settings reports no key by default", async () => {
    const res = await agent.get("/api/identify/settings");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hasKey: false, keyFromEnv: false, project: "all" });
  });

  it("rejects a blank API key", async () => {
    const res = await agent.put("/api/identify/settings").send({ apiKey: "   " });
    expect(res.status).toBe(400);
  });

  it("saves an API key and project, reports hasKey without leaking the key, then clears it", async () => {
    const put = await agent
      .put("/api/identify/settings")
      .send({ apiKey: "2b10secretkey", project: "k-world-flora" });
    expect(put.status).toBe(200);
    expect(put.body).toEqual({ hasKey: true, keyFromEnv: false, project: "k-world-flora" });

    const get = await agent.get("/api/identify/settings");
    expect(get.body.hasKey).toBe(true);
    expect(JSON.stringify(get.body)).not.toContain("2b10secretkey");

    const cleared = await agent
      .put("/api/identify/settings")
      .send({ apiKey: "", project: "" });
    expect(cleared.body).toEqual({ hasKey: false, keyFromEnv: false, project: "all" });
  });
});

describe("ntfy settings", () => {
  it("defaults to ntfy.sh with no topic and no token", async () => {
    const res = await agent.get("/api/ntfy/settings");
    expect(res.status).toBe(200);
    expect(res.body.server).toBe("https://ntfy.sh");
    expect(res.body.hasToken).toBe(false);
  });

  it("rejects an invalid server URL", async () => {
    const res = await agent.put("/api/ntfy/settings").send({ server: "not-a-url", topic: "my-topic" });
    expect(res.status).toBe(400);
  });

  it("rejects a topic with invalid characters", async () => {
    const res = await agent
      .put("/api/ntfy/settings")
      .send({ server: "https://ntfy.sh", topic: "has a space" });
    expect(res.status).toBe(400);
  });

  it("saves valid settings and a token, then reports hasToken without leaking it", async () => {
    const res = await agent
      .put("/api/ntfy/settings")
      .send({ server: "https://ntfy.sh", topic: "my-topic", token: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ server: "https://ntfy.sh", topic: "my-topic", hasToken: true });

    const getRes = await agent.get("/api/ntfy/settings");
    expect(getRes.body.hasToken).toBe(true);
    expect(JSON.stringify(getRes.body)).not.toContain("secret123");
  });

  it("test endpoint requires a topic", async () => {
    const res = await agent.post("/api/ntfy/test").send({ server: "https://ntfy.sh" });
    expect(res.status).toBe(400);
  });
});

describe("auth", () => {
  it("rejects a bad login", async () => {
    const res = await supertest(app).post("/api/auth/login").send({ username: TEST_ADMIN_USERNAME, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated requests to protected routes", async () => {
    const res = await supertest(app).get("/api/plants");
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me returns the logged-in user", async () => {
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(TEST_ADMIN_USERNAME);
    expect(res.body.role).toBe("admin");
  });
});

describe("roles and ownership", () => {
  let userAgent: ReturnType<typeof supertest.agent>;
  let userId: string;
  let userDisplayName: string;
  let speciesId: string;
  let adminPlantId: string;
  let userPlantId: string;

  beforeAll(async () => {
    const created = await agent.post("/api/users").send({
      username: "field-user",
      password: "field-user-password",
      role: "user",
      display_name: "Field User",
    });
    expect(created.status).toBe(201);
    userId = created.body.id;
    userDisplayName = created.body.display_name;

    userAgent = supertest.agent(app);
    const login = await userAgent
      .post("/api/auth/login")
      .send({ username: "field-user", password: "field-user-password" });
    expect(login.status).toBe(200);

    speciesId = (await agent.get("/api/species")).body[0].id;

    const adminPlant = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.1, longitude: -94.8, date_identified: "2026-08-20" });
    adminPlantId = adminPlant.body.id;

    const userPlant = await userAgent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.2, longitude: -94.7, date_identified: "2026-08-20" });
    userPlantId = userPlant.body.id;
  });

  it("a non-admin can't reach user or ntfy management", async () => {
    expect((await userAgent.get("/api/users")).status).toBe(403);
    expect((await userAgent.get("/api/ntfy/settings")).status).toBe(403);
    expect((await userAgent.get("/api/identify/settings")).status).toBe(403);
  });

  it("a plant a user creates is owned by them and stamped with their display name", async () => {
    const plant = await userAgent.get(`/api/plants/${userPlantId}`);
    expect(plant.body.owner_id).toBe(userId);
    expect(plant.body.logged_by).toBe(userDisplayName);
  });

  it("a user can view any plant but only mutate their own", async () => {
    expect((await userAgent.get(`/api/plants/${adminPlantId}`)).status).toBe(200);
    expect((await userAgent.patch(`/api/plants/${adminPlantId}`).send({ notes: "hi" })).status).toBe(403);
    expect((await userAgent.delete(`/api/plants/${adminPlantId}`)).status).toBe(403);
    expect((await userAgent.patch(`/api/plants/${userPlantId}`).send({ notes: "mine" })).status).toBe(200);
  });

  it("a user can't reassign a plant's owner, but an admin can", async () => {
    const attempt = await userAgent.patch(`/api/plants/${userPlantId}`).send({ owner_id: "someone-else" });
    expect(attempt.status).toBe(200);
    expect(attempt.body.owner_id).toBe(userId); // owner_id silently ignored for non-admins

    const reassign = await agent.patch(`/api/plants/${userPlantId}`).send({ owner_id: "test-admin-id-lookup" });
    expect(reassign.status).toBe(400); // unknown user id is rejected
  });

  it("treatments and photos on another user's plant are blocked for non-owners", async () => {
    const treatment = await userAgent
      .post(`/api/plants/${adminPlantId}/treatments`)
      .send({ date: "2026-08-21" });
    expect(treatment.status).toBe(403);

    const photo = await userAgent
      .post(`/api/plants/${adminPlantId}/photos`)
      .attach("photo", Buffer.from("img"), "x.jpg");
    expect(photo.status).toBe(403);

    const ownTreatment = await userAgent
      .post(`/api/plants/${userPlantId}/treatments`)
      .send({ date: "2026-08-21" });
    expect(ownTreatment.status).toBe(201);
  });

  it("bulk-reassign is admin-only and moves ownership of multiple plants at once", async () => {
    const forbidden = await userAgent
      .post("/api/plants/bulk-reassign")
      .send({ plant_ids: [adminPlantId], owner_id: userId });
    expect(forbidden.status).toBe(403);

    const badBody = await agent.post("/api/plants/bulk-reassign").send({ plant_ids: [], owner_id: userId });
    expect(badBody.status).toBe(400);

    const badOwner = await agent
      .post("/api/plants/bulk-reassign")
      .send({ plant_ids: [adminPlantId], owner_id: "no-such-user" });
    expect(badOwner.status).toBe(400);

    const secondAdminPlant = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.3, longitude: -94.6, date_identified: "2026-08-20" });

    const reassign = await agent
      .post("/api/plants/bulk-reassign")
      .send({ plant_ids: [adminPlantId, secondAdminPlant.body.id], owner_id: userId });
    expect(reassign.status).toBe(200);
    expect(reassign.body.updated_count).toBe(2);

    const moved = await agent.get(`/api/plants/${adminPlantId}`);
    expect(moved.body.owner_id).toBe(userId);
  });

  it("bulk-copy duplicates plants onto another user's account, leaving the originals untouched", async () => {
    const source = await agent
      .post("/api/plants")
      .send({ species_id: speciesId, latitude: 39.4, longitude: -94.5, date_identified: "2026-08-20", notes: "original" });
    const sourceId = source.body.id;

    const forbidden = await userAgent.post("/api/plants/bulk-copy").send({ plant_ids: [sourceId], owner_id: userId });
    expect(forbidden.status).toBe(403);

    const badBody = await agent.post("/api/plants/bulk-copy").send({ plant_ids: [], owner_id: userId });
    expect(badBody.status).toBe(400);

    const copyRes = await agent.post("/api/plants/bulk-copy").send({ plant_ids: [sourceId], owner_id: userId });
    expect(copyRes.status).toBe(201);
    expect(copyRes.body.created_count).toBe(1);
    const copyId = copyRes.body.created_ids[0];
    expect(copyId).not.toBe(sourceId);

    const copy = await agent.get(`/api/plants/${copyId}`);
    expect(copy.body.owner_id).toBe(userId);
    expect(copy.body.logged_by).toBe(userDisplayName);
    expect(copy.body.notes).toBe("original");
    expect(copy.body.species_id).toBe(speciesId);

    const original = await agent.get(`/api/plants/${sourceId}`);
    expect(original.body.owner_id).not.toBe(userId); // still the admin's, untouched by the copy
    expect(original.body.notes).toBe("original");
  });

  it("admin can impersonate a user, act with their permissions, then stop and return to admin", async () => {
    // Use a dedicated agent (not the shared module-level `agent`) so a failed assertion here
    // can't leave later tests stuck on an impersonated session.
    const adminAgent = supertest.agent(app);
    await adminAgent.post("/api/auth/login").send({ username: TEST_ADMIN_USERNAME, password: TEST_ADMIN_PASSWORD });

    const impersonate = await adminAgent.post(`/api/auth/impersonate/${userId}`);
    expect(impersonate.status).toBe(200);
    expect(impersonate.body.role).toBe("user");
    expect(impersonate.body.impersonating).toBe(true);
    expect(impersonate.body.real_admin.username).toBe(TEST_ADMIN_USERNAME);

    const me = await adminAgent.get("/api/auth/me");
    expect(me.body.id).toBe(userId);
    expect(me.body.impersonating).toBe(true);

    // Acting as the impersonated user: admin-only routes are now forbidden...
    expect((await adminAgent.get("/api/users")).status).toBe(403);
    // ...but the impersonated user's own plant is editable.
    const ownPlant = await adminAgent.patch(`/api/plants/${userPlantId}`).send({ notes: "via impersonation" });
    expect(ownPlant.status).toBe(200);

    const stop = await adminAgent.post("/api/auth/stop-impersonating");
    expect(stop.status).toBe(200);
    expect(stop.body.username).toBe(TEST_ADMIN_USERNAME);
    expect(stop.body.impersonating).toBe(false);
    expect(stop.body.real_admin).toBeNull();

    // Admin access is restored.
    expect((await adminAgent.get("/api/users")).status).toBe(200);
  });

  it("a non-admin can't impersonate, and an admin can't impersonate themselves or nest impersonation", async () => {
    const adminAgent = supertest.agent(app);
    await adminAgent.post("/api/auth/login").send({ username: TEST_ADMIN_USERNAME, password: TEST_ADMIN_PASSWORD });

    const selfTarget = await adminAgent.get("/api/auth/me").then((r) => adminAgent.post(`/api/auth/impersonate/${r.body.id}`));
    expect(selfTarget.status).toBe(400); // can't impersonate yourself

    const impersonate = await adminAgent.post(`/api/auth/impersonate/${userId}`);
    expect(impersonate.status).toBe(200);

    // Nested impersonation is blocked — since the effective role is now "user", this 403s via
    // requireAdmin before the explicit already-impersonating check ever runs.
    const nested = await adminAgent.post("/api/auth/impersonate/does-not-matter");
    expect(nested.status).toBe(403);

    const forbidden = await userAgent.post(`/api/auth/impersonate/${userId}`);
    expect(forbidden.status).toBe(403); // non-admins can't impersonate at all
  });

  it("admin resetting a user's password immediately invalidates their session", async () => {
    const before = await userAgent.get("/api/auth/me");
    expect(before.status).toBe(200);

    const reset = await agent.post(`/api/users/${userId}/reset-password`).send({ newPassword: "new-password-123" });
    expect(reset.status).toBe(200);

    const after = await userAgent.get("/api/auth/me");
    expect(after.status).toBe(401);
  });
});
