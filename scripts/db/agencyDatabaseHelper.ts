// agencyDatabaseHelper.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Agency } from './../model/agencyTypes';
import { Title } from './../model/titlesTypes';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

export interface DbShape {
  agencies: Agency[];
  titles: Title[];
}

// Store the central db.json inside the repository's `data/` folder.
// Resolve relative to the repository root (two levels up from this file: scripts/db -> repository root)
const DB_PATH = path.resolve(__dirname, '..', '..', 'data', 'db.json');

// Return a lowdb instance backed by the JSON file. This allows callers to
// use the chainable API (e.g. db.get('agencies').find(...).value()). We still
// keep the file on disk under DB_PATH via the FileSync adapter.
export async function readDb(): Promise<any> {
  const adapter = new FileSync(DB_PATH);
  const db = low(adapter);
  // Ensure defaults exist
  db.defaults({ agencies: [], titles: [] }).write();
  return db;
}

export async function writeDb(db: DbShape): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

export async function persistAgencies(agencies: Agency[]): Promise<void> {
  const db = await readDb();
  // lowdb API
  db.set('agencies', agencies).write();
}

export async function clearAgencies(): Promise<void> {
  const db = await readDb();
  db.set('agencies', []).write();
}

export function getDbPath(): string {
  return DB_PATH;
}

// Lookup helper: return an Agency by its short_name (or undefined if not found)
export async function getAgencyByShortName(shortName: string): Promise<Agency | undefined> {
  const db = await readDb();
  return db.get('agencies').find({ short_name: shortName }).value();
}

