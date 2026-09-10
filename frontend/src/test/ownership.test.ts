import { describe, it, expect } from "vitest";
import { isMyPlant } from "../lib/ownership";
import type { Plant, SessionUser } from "../types";

function plant(overrides: Partial<Plant>): Plant {
  return {
    id: "p1",
    species_id: "s1",
    latitude: 0,
    longitude: 0,
    gps_accuracy_m: null,
    status: "planned",
    method: null,
    notes: "",
    photo_path: null,
    date_identified: "2026-01-01",
    date_started: null,
    date_removed: null,
    geometry: null,
    logged_by: null,
    owner_id: null,
    owner_org_id: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function user(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: "u1",
    username: "u1",
    role: "user",
    display_name: "U1",
    must_change_password: false,
    org_id: null,
    org_name: null,
    impersonating: false,
    real_admin: null,
    ...overrides,
  };
}

describe("isMyPlant", () => {
  it("matches plants I own", () => {
    expect(isMyPlant(plant({ owner_id: "u1" }), user({ id: "u1" }))).toBe(true);
  });

  it("does not match another user's plant when I have no org", () => {
    expect(isMyPlant(plant({ owner_id: "u2", owner_org_id: "o1" }), user({ id: "u1", org_id: null }))).toBe(false);
  });

  it("matches a fellow org member's plant", () => {
    expect(isMyPlant(plant({ owner_id: "u2", owner_org_id: "o1" }), user({ id: "u1", org_id: "o1" }))).toBe(true);
  });

  it("does not match a plant owned by a different org", () => {
    expect(isMyPlant(plant({ owner_id: "u2", owner_org_id: "o2" }), user({ id: "u1", org_id: "o1" }))).toBe(false);
  });

  it("returns false with no user", () => {
    expect(isMyPlant(plant({ owner_id: "u1" }), null)).toBe(false);
  });
});
