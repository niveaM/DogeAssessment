// fetchTitles.ts
import { fetchAndSaveTitles } from './titleUtils';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';



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

// If CLI requested 'all', iterate titles.json and call fetchAndSaveTitles per title.
if (target === 'all') {
  (async () => {
    const titlesFile = path.join(DATA_DIR, 'titles.json');
    const content = await fs.readFile(titlesFile, 'utf8');
    const data = JSON.parse(content) as { titles?: Array<{ number: number }> };
    const list = data.titles || [];
    for (const t of list) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await fetchAndSaveTitles({ title: t.number }, agencySlugArg);
      } catch (err: any) {
        console.error(`Error fetching title ${t.number}:`, err?.message || err);
      }
    }
  })().catch((err) => {
    console.error('Error fetching titles:', err);
    process.exit(1);
  });
} else {
  const ref = { title: target };
  fetchAndSaveTitles(ref, agencySlugArg).catch((err) => {
    console.error('Error fetching title:', err);
    process.exit(1);
  });
}

// Processes either a single title (by number) or all titles. Usage:
//   node -r ts-node/register scripts/fetchTitles.ts 36
//   node -r ts-node/register scripts/fetchTitles.ts all
// Accept an optional agency slug so callers can tag the saved title objects.
// Usage examples:
//   node -r ts-node/register scripts/fetchTitles.ts 36
//   node -r ts-node/register scripts/fetchTitles.ts all
//   node -r ts-node/register scripts/fetchTitles.ts all "my-agency-slug"
// `fetchAndSaveTitles` was moved into `titleUtils.ts` and is imported above.
// This script now only parses CLI args and delegates to the shared helper.

// Helper to process one title entry and return merged object.
// Extracted to top-level for clarity and reuse.
// `processTitle` is implemented in `titleUtils.ts` and imported above so it can be reused

