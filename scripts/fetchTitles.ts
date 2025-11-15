// fetchTitles.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';
import { getTitleSummary } from './titleUtils';
import type { TitlesResponse, Title } from './model/titlesTypes';

const API_URL = 'https://www.ecfr.gov/api/versioner/v1/titles.json';

// Processes either a single title (by number) or all titles. Usage:
//   node -r ts-node/register scripts/fetchTitles.ts 36
//   node -r ts-node/register scripts/fetchTitles.ts all
// Accept an optional agency slug so callers can tag the saved title objects.
// Usage examples:
//   node -r ts-node/register scripts/fetchTitles.ts 36
//   node -r ts-node/register scripts/fetchTitles.ts all
//   node -r ts-node/register scripts/fetchTitles.ts all "my-agency-slug"
async function fetchAndSaveTitles(target: 'all' | number = 'all', agencySlug?: string) {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: TitlesResponse = await res.json();

  const rawTitles: TitlesResponse['titles'] = data.titles || [];

  // Helper to process one title entry and return merged object
  async function processTitle(titleObj: Title): Promise<Title> {
    // start with a shallow clone so we can attach fields on error path
    let merged: Title = { ...titleObj };

    // Basic validation: ensure number and name exist
    if (merged.number == null || !merged.name) {
      merged.error = 'Title object missing number or name';
      return merged;
    }

    try {
      merged = await getTitleSummary(titleObj, agencySlug);
      // no additional sanity-check — merged preserves the original title number
      return merged;
    } catch (err: any) {
      merged.error = err?.message || String(err);
      return merged;
    }
  }

  let toProcess: any[] = [];
  if (target === 'all') {
    toProcess = rawTitles;
  } else {
    const t = rawTitles.find((x: any) => Number(x.number) === Number(target));
    if (!t) throw new Error(`Title ${target} not found in API response`);
    toProcess = [t];
  }

  const results: any[] = [];
  for (const titleObj of toProcess) {
    console.log(`Processing Title ${titleObj.number} (${titleObj.name})`);
    // sequential processing to avoid hammering API
    // (could be parallelized with concurrency limit later)
    // eslint-disable-next-line no-await-in-loop
    const merged = await processTitle(titleObj);
    results.push(merged);
  }

  // Update data/titles.json in-place: merge results into the existing titles array
  await fs.mkdir(DATA_DIR, { recursive: true });
  const titlesPath = path.join(DATA_DIR, 'titles.json');

  let existing: any = { titles: [], meta: {} };
  try {
    const raw = await fs.readFile(titlesPath, 'utf8');
    existing = JSON.parse(raw);
  } catch (e: any) {
    // If file doesn't exist or can't be parsed, start fresh but keep meta empty
    existing = { titles: [], meta: {} };
  }

  if (!Array.isArray(existing.titles)) existing.titles = [];

  // Merge each result into existing.titles by matching 'number'
  for (const merged of results) {
    const idx = existing.titles.findIndex((t: any) => Number(t.number) === Number(merged.number));
    if (idx >= 0) {
      // Merge fields: overwrite existing with merged fields
      existing.titles[idx] = { ...existing.titles[idx], ...merged };
    } else {
      existing.titles.push(merged);
    }
  }

  await fs.writeFile(titlesPath, JSON.stringify(existing, null, 2));
  console.log(`Updated ${results.length} title(s) in ${titlesPath}`);
}

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

