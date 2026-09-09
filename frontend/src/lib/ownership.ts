import type { Plant, SessionUser } from "../types";

/**
 * Whether a plant counts as "mine" for the "only my plants" filters: plants I own, plus — if I
 * belong to an organization — every plant owned by a fellow org member, since orgs share plants.
 */
export function isMyPlant(plant: Plant, user: SessionUser | null): boolean {
  if (!user) return false;
  if (plant.owner_id === user.id) return true;
  return Boolean(user.org_id && plant.owner_org_id === user.org_id);
}
