// agencyDatabaseHelper.ts
import * as path from "path";
import type { Agency } from "../model/agencyTypes";
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";

// Store the central db.json inside the repository's `data/` folder.
// Resolve relative to the repository root (two levels up from this file: scripts/db -> repository root)
const DB_PATH = path.resolve(__dirname, "..", "..", "data", "db.json");

// Return a lowdb instance backed by the JSON file. This allows callers to
// use the chainable API (e.g. db.get('agencies').find(...).value()). We still
// keep the file on disk under DB_PATH via the FileSync adapter.
export async function readDb(): Promise<any> {
  const adapter = new FileSync(DB_PATH);
  const db = low(adapter);
  // Ensure defaults exist
  db.defaults({ agencies: [], titles: [], titleDetails: [] }).write();
  return db;
}

// Exported keys for the DB collections so callers can avoid hard-coded strings.
export const AGENCIES_KEY = 'agencies';

export async function persistAgencies(agencies: Agency[]): Promise<void> {
  const db = await readDb();
  // lowdb API
  db.set(AGENCIES_KEY, agencies).write();
}

export async function clearAgencies(): Promise<void> {
  const db = await readDb();
  db.set(AGENCIES_KEY, []).write();
}

export function getDbPath(): string {
  return DB_PATH;
}

// Lookup helper: return an Agency by its short_name (or undefined if not found)
export async function getAgencyByShortName(
  shortName: string
): Promise<Agency | undefined> {
  const db = await readDb();
  return db.get(AGENCIES_KEY).find({ short_name: shortName }).value();
}

// Lookup helper: return an Agency by its slug (or undefined if not found)
export async function getAgencyBySlug(
  slug: string
): Promise<Agency | undefined> {
  const db = await readDb();
  return db.get(AGENCIES_KEY).find({ slug: slug }).value();
}

export async function getAgencies(): Promise<Agency[]> {
  const db = await readDb();
  return db.get(AGENCIES_KEY).value() || [];
}

export function getTitlesFilePath(): string {
  return DB_PATH;
}
