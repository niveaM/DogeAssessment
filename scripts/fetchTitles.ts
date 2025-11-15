// fetchTitles.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';
import { getTitleSummary, fetchTitleVersionsWithSummary } from './titleUtils';
import type { TitlesResponse, Title } from './model/titlesTypes';

const API_URL = 'https://www.ecfr.gov/api/versioner/v1/titles.json';


// Read command-line argument
const arg = process.argv[2];
let target: 'all' | number = 'all';
if (arg && arg.toLowerCase() !== 'all') {
  const n = Number(arg);
  if (Number.isNaN(n)) {
    console.error(`Invalid argument '${arg}'. Use a title number or 'all'`);
    process.exit(1);
  }
  target = n;
}
// Optional agency slug may be provided as the second CLI argument
const agencySlugArg = process.argv[3];

fetchAndSaveTitles(target, agencySlugArg).catch((err) => {
  console.error('Error fetching titles:', err);
  process.exit(1);
});

// Processes either a single title (by number) or all titles. Usage:
//   node -r ts-node/register scripts/fetchTitles.ts 36
//   node -r ts-node/register scripts/fetchTitles.ts all
// Accept an optional agency slug so callers can tag the saved title objects.
// Usage examples:
//   node -r ts-node/register scripts/fetchTitles.ts 36
//   node -r ts-node/register scripts/fetchTitles.ts all
//   node -r ts-node/register scripts/fetchTitles.ts all "my-agency-slug"
async function fetchAndSaveTitles(targetTitle: 'all' | number = 'all', agencySlug?: string) {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: TitlesResponse = await res.json();

  const rawTitles: TitlesResponse['titles'] = data.titles || [];
  // Create a map of titles keyed by title number for easier lookups.
  // Key is the title number as a string, value is the Title object.
  const titlesMap: Record<string, Title> = {};
  for (const t of rawTitles) {
    if (t && t.number != null) titlesMap[String(t.number)] = t as Title;
  }

  let toProcess: any[] = [];
  if (targetTitle === 'all') {
    // Use the map values for processing
    toProcess = Object.values(titlesMap);
  } else {
    const t = titlesMap[String(targetTitle)];
    if (!t) throw new Error(`Title ${targetTitle} not found in API response`);
    toProcess = [t];
  }

  const results: any[] = [];
  for (const titleObj of toProcess) {
    console.log(`Processing Title ${titleObj.number} (${titleObj.name})`);
    // sequential processing to avoid hammering API
    // (could be parallelized with concurrency limit later)
    // eslint-disable-next-line no-await-in-loop
    const merged = await processTitle(titleObj, agencySlug);
    results.push(merged);
  }

  // Update data/titles.json in-place: merge results into the existing titles array
  await fs.mkdir(DATA_DIR, { recursive: true });
  const titlesPath = path.join(DATA_DIR, 'titles.json');

  // Assume `data/titles.json` uses the map shape:
  // { titles: { '<number>': Title, ... }, meta: {...} }
  // Read existing file if present; if missing or malformed, start with empty map.
  let existing: any = { titles: {}, meta: {} };
  try {
    const raw = await fs.readFile(titlesPath, 'utf8');
    existing = JSON.parse(raw);
    if (!existing.titles || typeof existing.titles !== 'object') existing.titles = {};
  } catch (e: any) {
    // If file doesn't exist or can't be parsed, start fresh with map shape
    existing = { titles: {}, meta: {} };
  }

  // Merge each result into existing.titles keyed by number (string)
  for (const merged of results) {
    const key = String(merged.number);
    existing.titles[key] = { ...(existing.titles[key] || {}), ...merged };
  }

  await fs.writeFile(titlesPath, JSON.stringify(existing, null, 2));
  console.log(`Updated ${results.length} title(s) in ${titlesPath}`);
}

// Helper to process one title entry and return merged object.
// Extracted to top-level for clarity and reuse.
export async function processTitle(titleObj: Title, agencySlug?: string): Promise<Title> {
  // start with a shallow clone so we can attach fields on error path
  let merged: Title = { ...titleObj };

  // Basic validation: ensure number and name exist
  if (merged.number == null || !merged.name) {
    merged.debug = { ...(merged.debug || {}), error: 'Title object missing number or name' };
    return merged;
  }

  try {
    merged = await getTitleSummary(titleObj, agencySlug);
    // attach versions summary by passing the merged Title into the helper
    // (this may add `summary` or `versionsSummary` depending on implementation)
    // eslint-disable-next-line no-await-in-loop
    merged = await fetchTitleVersionsWithSummary(merged, agencySlug);
    // no additional sanity-check — merged preserves the original title number
    return merged;
  } catch (err: any) {
    merged.debug = { ...(merged.debug || {}), error: err?.message || String(err) };
    return merged;
  }
}

