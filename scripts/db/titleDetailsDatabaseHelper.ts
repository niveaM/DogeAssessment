// titleDatabaseHelper.ts
import * as path from "path";
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
  db.defaults({ agencies: [], titles: [], titleDetails: [] }).write();
  return db;
}

// Exported keys for the DB collections so callers can avoid hard-coded strings.
export const TITLE_DETAILS_KEY = 'titleDetails';

export function getDbPath(): string {
  return DB_PATH;
}


export async function writeTitleDetailsDb(title: Title): Promise<void> {
  const db = await readDb();
  return db.get(TITLE_DETAILS_KEY).push(title).write();
}

export async function getTitleDetails(): Promise<Title[]> {
  const db = await readDb();
  return db.get(TITLE_DETAILS_KEY).value() || [];
}

export async function persistTitleDetails(titles: Title[]): Promise<void> {
  const db = await readDb();
  db.set(TITLE_DETAILS_KEY, titles).write();
}

// Return a single Title by number (or undefined). Accepts number or string.
export async function getTitleByNumber(
  titleNumber: number
): Promise<Title | undefined> {
  console.log('getTitleByNumber: called with', titleNumber);
  if (titleNumber == null) return undefined;
  const db = await readDb();
  // Use lowdb find to avoid pulling the full array into memory for mutation
  return db.get(TITLE_DETAILS_KEY).find({ number: titleNumber }).value();

}

export async function addOrUpdateTitleDetails(title: Title): Promise<void> {
  if (!title || title.number == null)
    throw new Error("addOrUpdateTitle requires a Title with a number");
  const db = await readDb();
  db.get(TITLE_DETAILS_KEY)
    .find({ title: title.number })
    .assign(title)
    .write();
}

export async function addOrUpdateTitleDetailsList(titles: Title[]): Promise<void> {
  if (!Array.isArray(titles)) return;
  const db = await readDb();
  // Overwrite titles array with provided list (no merging)
  db.set(TITLE_DETAILS_KEY, titles).write();
}

export async function clearTitleDetails(): Promise<void> {
  const db = await readDb();
  db.set(TITLE_DETAILS_KEY, []).write();
}

export function getTitleDetailsFilePath(): string {
  return DB_PATH;
}
