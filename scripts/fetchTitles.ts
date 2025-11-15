// fetchTitles.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './config';
import { getTitleSummary } from './titleUtils';
// import { TitlesResponse } from './titlesTypes'; // Optional if using types

const API_URL = 'https://www.ecfr.gov/api/versioner/v1/titles.json';

// Processes either a single title (by number) or all titles. Usage:
//   node -r ts-node/register scripts/fetchTitles.ts 36
//   node -r ts-node/register scripts/fetchTitles.ts all
async function fetchAndSaveTitles(target: 'all' | number = 'all') {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();

  const rawTitles: any[] = data.titles || [];

  // Helper to process one title entry and return merged object
  async function processTitle(titleObj: any) {
    const merged: any = { ...titleObj };

    // Basic validation: ensure number and name exist
    if (merged.number == null || !merged.name) {
      merged.error = 'Title object missing number or name';
      return merged;
    }

    try {
      const dateString = titleObj.latest_issue_date;
      const summary = await getTitleSummary(Number(titleObj.number), dateString);

      // Verify title number returned by summary matches the API title number
      if (Number(summary.titleNumber) !== Number(titleObj.number)) {
        merged.error = `Title number mismatch: API ${titleObj.number} vs summary ${summary.titleNumber}`;
        // still attach returned summary details for debugging
        merged.summary = summary;
        return merged;
      }

      // Merge all useful details from the summary
      merged.checksum = summary.checksum;
      merged.wordCount = summary.wordCount;
      merged.dateString = summary.dateString; // may be same as latest_issue_date

      // If the date differs from API's latest_issue_date, keep both and flag it
      if (summary.dateString !== titleObj.latest_issue_date) {
        merged.dateStringMismatch = {
          latest_issue_date: titleObj.latest_issue_date,
          summary_dateString: summary.dateString
        };
      }
    } catch (err: any) {
      merged.error = err?.message || String(err);
    }
    return merged;
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

fetchAndSaveTitles(target).catch((err) => {
  console.error('Error fetching titles:', err);
  process.exit(1);
});

