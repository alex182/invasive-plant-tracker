export type PlantStatus = "planned" | "pending" | "removed";

export interface SpeciesPhoto {
  url: string;
  caption: string;
  attribution: string;
  source_url: string;
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
  created_at: string;
  updated_at: string;
}

export interface IdentifyResult {
  scientific_name: string;
  common_names: string[];
  score: number;
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
  created_at: string;
  updated_at: string;
}
