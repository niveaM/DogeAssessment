// titleDatabaseHelper.ts
import * as path from 'path';
import type { Title } from './../model/titlesTypes';
import { getDbPath } from './agencyDatabaseHelper';

export type TitlesMap = Record<string, Title>;

// Persist titles as an array in the DB to keep the shape simple and stable.
export interface TitlesDbShape {
  titles: Title[];
}

// Use the same db.json path as agencyDatabaseHelper
const DB_JSON = getDbPath();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const low = require('lowdb');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FileSync = require('lowdb/adapters/FileSync');

function getLowDb() {
  const adapter = new FileSync(DB_JSON);
  const db = low(adapter);
  db.defaults({ agencies: [], titles: [] }).write();
  return db;
}

export async function readTitlesDb(): Promise<TitlesDbShape> {
  try {
    const db = getLowDb();
    const titles = db.get('titles').value() as Title[] || [];
    return { titles } as TitlesDbShape;
  } catch (err: any) {
    return { titles: [] } as TitlesDbShape;
  }
}

export async function writeTitlesDb(dbShape: TitlesDbShape): Promise<void> {
  const db = getLowDb();
  db.set('titles', dbShape.titles || []).write();
}

export async function getTitlesMap(): Promise<TitlesMap> {
  const db = await readTitlesDb();
  const list = db.titles || [];
  const map: TitlesMap = {};
  for (const t of list) {
    if (t && t.number != null) map[String(t.number)] = t;
  }
  return map;
}

export async function addOrUpdateTitle(title: Title): Promise<void> {
  if (!title || title.number == null) throw new Error('addOrUpdateTitle requires a Title with a number');
  const db = getLowDb();
  const list: Title[] = db.get('titles').value() || [];
  const key = String(title.number);
  let replaced = false;
  for (let i = 0; i < list.length; i++) {
    if (String(list[i]?.number) === key) {
      list[i] = title;
      replaced = true;
      break;
    }
  }
  if (!replaced) list.push(title);
  db.set('titles', list).write();
}

export async function addOrUpdateTitles(titles: Title[]): Promise<void> {
  if (!Array.isArray(titles)) return;
  const db = getLowDb();
  // Overwrite titles array with provided list (no merging)
  db.set('titles', titles).write();
}

export async function clearTitles(): Promise<void> {
  const db = getLowDb();
  db.set('titles', []).write();
}

export function getTitlesFilePath(): string {
  return DB_JSON;
}
