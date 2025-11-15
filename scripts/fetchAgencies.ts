// fetchAgencies.ts
import fetch from 'node-fetch';
import { AgenciesResponse, Agency } from './model/agencyTypes';
import { fetchAndSaveTitles } from './titleUtils';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';

const API_URL = 'https://www.ecfr.gov/api/admin/v1/agencies.json';

// Allow passing an optional agency short name as the first CLI argument.
const shortNameArg = process.argv[2];
fetchAndSaveAgencies(shortNameArg).catch((err) => {
  console.error('Error fetching agencies:', err);
});

async function fetchAndSaveAgencies(agencyShortName?: string) {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: AgenciesResponse = await res.json();

  // Build a map of agencies keyed by their short_name (acronym).
  type AgenciesMap = Record<string, Agency>;

  function buildAgenciesMap(list: Agency[] = []): AgenciesMap {
    const map: AgenciesMap = {};
    function walk(items: Agency[]) {
      for (const a of items) {
        const key = a.short_name;
        if (key && key.toString().trim().length > 0) {
          map[key] = a;
        }
        if (Array.isArray(a.children) && a.children.length) {
          walk(a.children);
        }
      }
    }
    walk(list);
    return map;
  }
  const agenciesList = (data && Array.isArray(data.agencies)) ? data.agencies : [];
  const agenciesMap = buildAgenciesMap(agenciesList);

  if (agencyShortName) {
    // processAgency may perform I/O (calls fetchAndSaveTitles), so await it.
    // eslint-disable-next-line no-await-in-loop
    await processAgency(agencyShortName, agenciesMap);
  }

  // ensure data directory exists, then write the file into it
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, 'agencies.json');
  await fs.writeFile(outPath, JSON.stringify(agenciesMap, null, 2));
  console.log(`Fetched and saved agencies map (${Object.keys(agenciesMap).length} entries) to ${outPath}`);
}

// non-destructive helper to print agency details when a short name is provided
async function processAgency(shortName: string | undefined, map: Record<string, Agency>) {
  if (!shortName || String(shortName).trim().length === 0) return;
  const key = String(shortName).trim();
  const agency = map[key];
  if (!agency) {
    console.log(`Agency with short name '${key}' not found.`);
    return;
  }

  console.log(`Processing CFR references for agency '${key}' (slug: ${agency.slug})`);

  // For each CFR reference, call fetchAndSaveTitles with title, agency slug, and chapter
  if (Array.isArray(agency.cfr_references)) {
    for (const ref of agency.cfr_references) {
      try {
        console.log(`Fetching ${JSON.stringify(ref)} for agency '${agency.slug}'`);  
        // sequential to avoid overwhelming local processing; could be parallelized later
        // eslint-disable-next-line no-await-in-loop
        await fetchAndSaveTitles(ref, agency.slug);
      } catch (err: any) {
        console.error(`Error processing title ${ref?.title} for agency ${agency.slug}:`, err?.message || err);
      }
    }
  } else {
    console.log(`No CFR references found for agency '${key}'.`);
  }
}
