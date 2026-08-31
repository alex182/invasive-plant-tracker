import { db } from "./index";

function addColumnIfMissing(table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function dropColumnIfPresent(table: string, column: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS species (
      id TEXT PRIMARY KEY,
      common_name TEXT NOT NULL,
      scientific_name TEXT NOT NULL,
      category TEXT NOT NULL,
      id_summary TEXT NOT NULL DEFAULT '',
      id_key_tell TEXT NOT NULL DEFAULT '',
      removal_summary TEXT NOT NULL DEFAULT '',
      best_timing TEXT NOT NULL DEFAULT '',
      herbicide_notes TEXT NOT NULL DEFAULT '',
      source_links TEXT NOT NULL DEFAULT '[]',
      active_months TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS plant (
      id TEXT PRIMARY KEY,
      species_id TEXT NOT NULL REFERENCES species(id),
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      gps_accuracy_m REAL,
      status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','pending','removed')),
      method TEXT,
      notes TEXT NOT NULL DEFAULT '',
      photo_path TEXT,
      date_identified TEXT NOT NULL,
      date_started TEXT,
      date_removed TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_plant_species ON plant(species_id);
    CREATE INDEX IF NOT EXISTS idx_plant_status ON plant(status);

    CREATE TABLE IF NOT EXISTS treatment (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL REFERENCES plant(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      method TEXT,
      herbicide TEXT,
      outcome TEXT,
      followup_due TEXT,
      followup_done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_treatment_plant ON treatment(plant_id);
    CREATE INDEX IF NOT EXISTS idx_treatment_followup ON treatment(followup_due);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  dropColumnIfPresent("species", "photo_url");
  dropColumnIfPresent("species", "photo_attribution");
  dropColumnIfPresent("species", "photo_source_url");
  addColumnIfMissing("species", "photos", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("species", "lookalikes", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("species", "removal_methods", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("plant", "geometry", "TEXT");
}
