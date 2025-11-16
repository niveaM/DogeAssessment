// fetchAgencies.ts
import fetch from 'node-fetch';
import { Agency } from './model/agencyTypes';
import { fetchAgencyList as fetchAgencyKeys } from './agencyUtils';
import { readDb, getAgencyByShortName } from './db/agencyDatabaseHelper';
import { fetchAndSaveTitles, loadTitlesMap } from './titleUtils';
import type { Title } from './model/titlesTypes';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';

// Allow passing an optional agency short name as the first CLI argument.
const shortNameArg = process.argv[2];
fetchAndSaveAgencies(shortNameArg).catch((err) => {
  console.error('Error fetching agencies:', err);
});

async function fetchAndSaveAgencies(agencyShortName?: string) {
  // Fetch agencies (this persists agencies into the repo DB) and get the
  // list of agency keys. Then load the persisted agencies from the DB and
  // reconstruct a map keyed by short_name for downstream processing.
  const agencyKeys: string[] = await fetchAgencyKeys();

  // Read persisted agencies from the DB and reconstruct a map keyed by short_name
  const db = await readDb();
  const agenciesArray = Array.isArray(db.get('agencies').value()) ? db.get('agencies').value() : [];
  const agenciesMap: Record<string, Agency> = {};
  for (const a of agenciesArray) {
    if (a && a.short_name) agenciesMap[String(a.short_name)] = a;
  }

  if (agencyShortName) {
    // processAgency may perform I/O (calls fetchAndSaveTitles), so await it.
    // eslint-disable-next-line no-await-in-loop
    await processAgency(agencyShortName);
  }
  else {
    // No specific agency requested: process all agencies sequentially.
    // Sequential processing avoids overwhelming upstream services or local I/O.
    // Prefer the keys returned by fetchAgencyList (they reflect truncation),
    // but fall back to the reconstructed agenciesMap keys if needed.
    const keys = (Array.isArray(agencyKeys) && agencyKeys.length) ? agencyKeys : Object.keys(agenciesMap);
    console.log(`No short name provided — processing ${keys.length} agencies sequentially.`);
    for (const key of keys) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await processAgency(key);
      } catch (err: any) {
        console.error(`Error processing agency '${key}':`, err?.message || err);
      }
    }
  }

  // ensure data directory exists, then write the file into it
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, 'agencies.json');
  await fs.writeFile(outPath, JSON.stringify(agenciesMap, null, 2));
  console.log(`Fetched and saved agencies map (${Object.keys(agenciesMap).length} entries) to ${outPath}`);
}

// non-destructive helper to print agency details when a short name is provided
async function processAgency(shortName: string) {
  if (!shortName || String(shortName).trim().length === 0) {
    throw new Error('processAgency requires a non-empty shortName');
  }
  const key = String(shortName).trim();

  // Read agency from DB using helper
  const agency = await getAgencyByShortName(key);
  if (!agency) {
    console.log(`Agency with short name '${key}' not found.`);
    return;
  }

  console.log(`Processing CFR references for agency '${key}' (slug: ${agency.slug})`);

  // Load titles map for title lookups
  const titlesMap = await loadTitlesMap();

  // For each CFR reference, call fetchAndSaveTitles with title, agency slug, and chapter
  if (Array.isArray(agency.cfr_references)) {
    for (const ref of agency.cfr_references) {
      try {
        console.log(`Fetching ${JSON.stringify(ref)} for agency '${agency.slug}'`);
        // Look up the Title object from the pre-loaded titlesMap
        const titleObj = titlesMap[String(ref.title)];
        if (!titleObj) {
          console.warn(`Title ${String(ref.title)} not found in titles.json — skipping`);
          continue;
        }
        // sequential to avoid overwhelming local processing; could be parallelized later
        // eslint-disable-next-line no-await-in-loop
        const titleData = await fetchAndSaveTitles(titleObj, ref, agency);
        // do nothing with titleData for now; could aggregate stats if desired
      } catch (err: any) {
        console.error(`Error processing title ${ref?.title} for agency ${agency.slug}:`, err?.message || err);
      }
    }
  } else {
    console.log(`No CFR references found for agency '${key}'.`);
  }

}
