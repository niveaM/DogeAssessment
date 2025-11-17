// fetchTitles.ts
import { fetchAndSaveTitles } from '../src/utils/titleUtils';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TST_DATA_DIR } from 'test-config';
import type { Title } from '../src/model/titleTypes';
import type { Agency } from '../src/model/agencyTypes';



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
    const titlesFile = path.join(TST_DATA_DIR, "titles.json");
    const content = await fs.readFile(titlesFile, 'utf8');
    const data = JSON.parse(content) as { titles?: Record<string, Title> };
    const list = Object.values(data.titles || {});
    for (const t of list) {
      try {
        // resolve agency object (if provided) so callers pass an Agency, not a string
        let agencyObj: Agency | undefined;
        if (agencySlugArg) {
          try {
            const agenciesFile = path.join(TST_DATA_DIR, 'agencies.json');
            const agenciesContent = await fs.readFile(agenciesFile, 'utf8');
            const agenciesMap = JSON.parse(agenciesContent) as Record<string, Agency>;
            agencyObj = agenciesMap[agencySlugArg] || Object.values(agenciesMap).find(a => a.slug === agencySlugArg);
            if (!agencyObj) console.warn(`Agency '${agencySlugArg}' not found in ${agenciesFile}; continuing without agency`);
          } catch (e) {
            console.warn('Failed to resolve agency from agencies.json:', e);
          }
        }
        // eslint-disable-next-line no-await-in-loop
        await fetchAndSaveTitles(t, undefined, agencyObj);
      } catch (err: any) {
        console.error(`Error fetching title ${t.number}:`, err?.message || err);
      }
    }
  })().catch((err) => {
    console.error('Error fetching titles:', err);
    process.exit(1);
  });
} else {
  (async () => {
    const titlesFile = path.join(TST_DATA_DIR, 'titles.json');
    const content = await fs.readFile(titlesFile, 'utf8');
    const data = JSON.parse(content) as { titles?: Record<string, Title> };
    const titleObj = data.titles ? data.titles[String(target)] : undefined;
    if (!titleObj) {
      console.error(`Title ${target} not found in ${titlesFile}`);
      process.exit(1);
    }
    // resolve agency object (if provided) so we pass Agency not string
    let agencyObj: Agency | undefined;
    if (agencySlugArg) {
      try {
        const agenciesFile = path.join(TST_DATA_DIR, 'agencies.json');
        const agenciesContent = await fs.readFile(agenciesFile, 'utf8');
        const agenciesMap = JSON.parse(agenciesContent) as Record<string, Agency>;
        agencyObj = agenciesMap[agencySlugArg] || Object.values(agenciesMap).find(a => a.slug === agencySlugArg);
        if (!agencyObj) console.warn(`Agency '${agencySlugArg}' not found in ${agenciesFile}; continuing without agency`);
      } catch (e) {
        console.warn('Failed to resolve agency from agencies.json:', e);
      }
    }
    await fetchAndSaveTitles(titleObj, undefined, agencyObj);
  })().catch((err) => {
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

