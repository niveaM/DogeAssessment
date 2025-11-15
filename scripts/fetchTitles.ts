// fetchTitles.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';
import { getTitleSummary, fetchTitleVersionsWithSummary, processTitle } from './titleUtils';
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

  let processed = 0;
  // Ensure per-title directory exists
  const perTitleDir = path.join(DATA_DIR, 'title');
  await fs.mkdir(perTitleDir, { recursive: true });

  for (const titleObj of toProcess) {
    console.log(`Processing Title ${titleObj.number} (${titleObj.name})`);
    // sequential processing to avoid hammering API
    // (could be parallelized with concurrency limit later)
    // eslint-disable-next-line no-await-in-loop
    const merged = await processTitle(titleObj, agencySlug);

    // write individual file for this title
    const outFile = path.join(perTitleDir, `${String(merged.number)}.json`);
    // eslint-disable-next-line no-await-in-loop
    await fs.writeFile(outFile, JSON.stringify(merged, null, 2));
    console.log(`Wrote title ${merged.number} to ${outFile}`);
    processed += 1;
  }

  console.log(`Processed and wrote ${processed} title(s) to ${perTitleDir}`);
}

// Helper to process one title entry and return merged object.
// Extracted to top-level for clarity and reuse.
// `processTitle` is implemented in `titleUtils.ts` and imported above so it can be reused

