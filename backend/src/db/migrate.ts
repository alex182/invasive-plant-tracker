import { randomUUID } from "node:crypto";
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

/**
 * The `plant` table was originally created with CHECK (status IN ('planned','pending','removed')).
 * SQLite can't ALTER a CHECK constraint, so widen it once via a table rebuild (12-step recipe from
 * the SQLite docs). Guarded on the stored DDL so it runs at most once.
 */
function widenPlantStatusCheck(): void {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'plant'")
    .get() as { sql: string } | undefined;
  if (!row || row.sql.includes("'monitoring'")) return;

  const newTableSql = row.sql
    .replace(/CREATE TABLE (IF NOT EXISTS )?"?plant"?/i, "CREATE TABLE plant_new")
    .replace("'planned','pending','removed'", "'planned','pending','monitoring','removed'");
  if (!newTableSql.includes("'monitoring'")) {
    throw new Error("widenPlantStatusCheck: could not rewrite the plant CHECK constraint");
  }

  const cols = (db.prepare("PRAGMA table_info(plant)").all() as { name: string }[])
    .map((c) => c.name)
    .join(", ");

  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      db.exec(newTableSql);
      db.exec(`INSERT INTO plant_new (${cols}) SELECT ${cols} FROM plant`);
      db.exec("DROP TABLE plant");
      db.exec("ALTER TABLE plant_new RENAME TO plant");
      db.exec("CREATE INDEX IF NOT EXISTS idx_plant_species ON plant(species_id)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_plant_status ON plant(status)");
      const violations = db.pragma("foreign_key_check") as unknown[];
      if (violations.length > 0) {
        throw new Error(`plant table rebuild left ${violations.length} foreign-key violation(s)`);
      }
    })();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

/** Seed a plant_photo row from any legacy single `plant.photo_path`. Idempotent. */
function backfillPlantPhotos(): void {
  const rows = db
    .prepare(
      "SELECT id, photo_path, date_identified, created_at FROM plant WHERE photo_path IS NOT NULL AND photo_path <> ''"
    )
    .all() as { id: string; photo_path: string; date_identified: string; created_at: string }[];
  if (rows.length === 0) return;

  const existing = db.prepare("SELECT 1 FROM plant_photo WHERE plant_id = ? AND path = ?");
  const insert = db.prepare(
    `INSERT INTO plant_photo (id, plant_id, treatment_id, path, caption, taken_on, created_at)
     VALUES (@id, @plant_id, NULL, @path, '', @taken_on, @created_at)`
  );

  db.transaction(() => {
    for (const r of rows) {
      if (existing.get(r.id, r.photo_path)) continue;
      const takenOn = r.date_identified || (r.created_at || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
      insert.run({
        id: randomUUID(),
        plant_id: r.id,
        path: r.photo_path,
        taken_on: takenOn,
        created_at: r.created_at || new Date().toISOString(),
      });
    }
  })();
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
      status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','pending','monitoring','removed')),
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

    CREATE TABLE IF NOT EXISTS plant_photo (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL REFERENCES plant(id) ON DELETE CASCADE,
      treatment_id TEXT REFERENCES treatment(id) ON DELETE SET NULL,
      path TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      taken_on TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_plant_photo_plant ON plant_photo(plant_id);
    CREATE INDEX IF NOT EXISTS idx_plant_photo_treatment ON plant_photo(treatment_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
      display_name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_session_user ON session(user_id);
    CREATE INDEX IF NOT EXISTS idx_session_expires ON session(expires_at);
  `);

  dropColumnIfPresent("species", "photo_url");
  dropColumnIfPresent("species", "photo_attribution");
  dropColumnIfPresent("species", "photo_source_url");
  addColumnIfMissing("species", "photos", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("species", "lookalikes", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("species", "removal_methods", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("plant", "geometry", "TEXT");
  addColumnIfMissing("plant", "logged_by", "TEXT");
  addColumnIfMissing("treatment", "logged_by", "TEXT");
  addColumnIfMissing("plant", "owner_id", "TEXT REFERENCES user(id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_plant_owner ON plant(owner_id)");

  widenPlantStatusCheck();
  backfillPlantPhotos();
}
