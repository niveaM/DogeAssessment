// agencyDatabaseHelper.ts
import * as fs from "fs/promises";
import * as path from "path";
import type { Agency } from "../model/agencyTypes";
import { Title } from "../model/titlesTypes";
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
  db.defaults({ agencies: [], titles: [] }).write();
  return db;
}

// Exported keys for the DB collections so callers can avoid hard-coded strings.
export const AGENCIES_KEY = 'agencies';
export const TITLES_KEY = 'titles';

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

export async function getAgencies(): Promise<Agency[]> {
  const db = await readDb();
  return db.get(AGENCIES_KEY).value() || [];
}


export async function writeTitlesDb(title: Title): Promise<void> {
  const db = await readDb();
  return db.get(TITLES_KEY).push(title).write();
}

export async function getTitles(): Promise<Title[]> {
  const db = await readDb();
  return db.get(TITLES_KEY).value() || [];
}

export async function persistTitles(titles: Title[]): Promise<void> {
  const db = await readDb();
  db.set(TITLES_KEY, titles).write();
}

// Return a single Title by number (or undefined). Accepts number or string.
export async function getTitleByNumber(
  titleNumber: number | string
): Promise<Title | undefined> {
  if (titleNumber == null) return undefined;
  const db = await readDb();
  // Use lowdb find to avoid pulling the full array into memory for mutation
  return db.get(TITLES_KEY).find({ id: titleNumber }).value();

}

export async function addOrUpdateTitle(title: Title): Promise<void> {
  if (!title || title.number == null)
    throw new Error("addOrUpdateTitle requires a Title with a number");
  const db = readDb();
  db.get(TITLES_KEY)
    .find({ number: title.number })
    .assign({ title: "lowdb is super awesome" })
    .write();
}

export async function addOrUpdateTitles(titles: Title[]): Promise<void> {
  if (!Array.isArray(titles)) return;
  const db = await readDb();
  // Overwrite titles array with provided list (no merging)
  db.set(TITLES_KEY, titles).write();
}

export async function clearTitles(): Promise<void> {
  const db = await readDb();
  db.set(TITLES_KEY, []).write();
}

export function getTitlesFilePath(): string {
  return DB_PATH;
}
