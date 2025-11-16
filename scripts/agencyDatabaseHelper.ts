// agencyDatabaseHelper.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Agency } from './model/agencyTypes';

export interface DbShape {
  agencies: Agency[];
  searchCache?: Record<string, any>;
  [k: string]: any;
}

const DB_PATH = path.resolve(__dirname, '..', 'db.json');

export async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return parsed as DbShape;
  } catch (err: any) {
    // If file missing or invalid, return a default shape
    return { agencies: [], searchCache: {} };
  }
}

export async function writeDb(db: DbShape): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

export async function persistAgencies(agencies: Agency[]): Promise<void> {
  const db = await readDb();
  db.agencies = agencies;
  await writeDb(db);
}

export async function clearAgencies(): Promise<void> {
  const db = await readDb();
  db.agencies = [];
  await writeDb(db);
}

export function getDbPath(): string {
  return DB_PATH;
}
