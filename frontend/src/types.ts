export type PlantStatus = "planned" | "pending" | "monitoring" | "removed";

export interface SpeciesPhoto {
  url: string;
  caption: string;
  attribution: string;
  source_url: string;
}

export interface RemovalMethod {
  /** e.g. "Mechanical / hand-pull", "Cut-stump", "Basal bark", "Foliar spray", "Prescribed fire". */
  method: string;
  timing: string;
  /** Product/active ingredient + rate, or "" for a non-chemical method. */
  herbicide: string;
  how_to: string;
  notes: string;
}

export interface SpeciesLookalike {
  /** Common name of the non-invasive/native species it's confused with. */
  name: string;
  scientific_name: string;
  /** How to distinguish it from the invasive species in this record. */
  how_to_tell: string;
  photo: SpeciesPhoto | null;
}

export interface Species {
  id: string;
  common_name: string;
  scientific_name: string;
  category: string;
  id_summary: string;
  id_key_tell: string;
  removal_summary: string;
  best_timing: string;
  herbicide_notes: string;
  source_links: string[];
  active_months: number[];
  photos: SpeciesPhoto[];
  lookalikes: SpeciesLookalike[];
  removal_methods: RemovalMethod[];
}

export interface Plant {
  id: string;
  species_id: string;
  latitude: number;
  longitude: number;
  gps_accuracy_m: number | null;
  status: PlantStatus;
  method: string | null;
  notes: string;
  photo_path: string | null;
  date_identified: string;
  date_started: string | null;
  date_removed: string | null;
  /** Patch outline as [lat, lng] vertices, or null for a single-point plant. */
  geometry: [number, number][] | null;
  /** Name of whoever logged this plant (set once at creation), or null. */
  logged_by: string | null;
  /** The user who owns this plant, or null for legacy pre-account records. */
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlantPhoto {
  id: string;
  plant_id: string;
  /** Treatment this photo documents, or null for a general plant photo. */
  treatment_id: string | null;
  path: string;
  caption: string;
  /** ISO date the photo was taken. */
  taken_on: string;
  created_at: string;
}

export interface NtfySettings {
  server: string;
  topic: string;
  hasToken: boolean;
}

export interface IdentifySettings {
  hasKey: boolean;
  keyFromEnv: boolean;
  project: string;
}

export interface IdentifyResult {
  scientific_name: string;
  common_names: string[];
  score: number;
}

export type Role = "admin" | "user";

export interface User {
  id: string;
  username: string;
  role: Role;
  display_name: string;
  active: boolean | number;
  must_change_password: boolean | number;
  created_at: string;
}

export interface Treatment {
  id: string;
  plant_id: string;
  date: string;
  method: string | null;
  herbicide: string | null;
  outcome: string | null;
  followup_due: string | null;
  followup_done: boolean | number;
  logged_by: string | null;
  created_at: string;
  updated_at: string;
}
