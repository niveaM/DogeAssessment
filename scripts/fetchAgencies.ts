// fetchAgencies.ts
import fetch from 'node-fetch';
import { AgenciesResponse, Agency } from './model/agencyTypes';
import { buildAgenciesMap, type AgenciesMap } from './agencyUtils';
import { fetchAndSaveTitles } from './titleUtils';
import type { Title } from './model/titlesTypes';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR, AGENCIES_TRUNCATE_LIMIT } from './config';
import { persistAgencies, getDbPath, clearAgencies } from './agencyDatabaseHelper';

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

  // // Truncate to the first 3 top-level agencies for faster local processing
  // const truncatedAgenciesList = agenciesList.slice(0, 3);
  // if (truncatedAgenciesList.length !== agenciesList.length) {
  //   console.log(`Truncating agencies list from ${agenciesList.length} to ${truncatedAgenciesList.length} entries for processing`);
  // }

  // Build a map of agencies keyed by their short_name (acronym).

  const fullAgenciesList = (data && Array.isArray(data.agencies)) ? data.agencies : [];
  const truncatedAgenciesList = fullAgenciesList.slice(0, AGENCIES_TRUNCATE_LIMIT);
  if (truncatedAgenciesList.length !== fullAgenciesList.length) {
    console.log(`Truncating agencies list from ${fullAgenciesList.length} to ${truncatedAgenciesList.length} entries for processing`);
  }
  const agenciesMap: AgenciesMap = buildAgenciesMap(truncatedAgenciesList);

  // Clear existing agencies in db.json first, then persist the current
  // agencies derived from the agenciesMap (use Object.values to get an array).
  try {
    await clearAgencies();
    const agenciesToPersist: Agency[] = Object.values(agenciesMap);
    await persistAgencies(agenciesToPersist);
    console.log(`Cleared and persisted agencies to ${getDbPath()} (${agenciesToPersist.length} entries)`);
  } catch (err: any) {
    console.error('Failed to clear/persist agencies to db.json:', err?.message || err);
  }


  // Load titles map once and pass Title objects into fetchAndSaveTitles
  const titlesFile = path.join(DATA_DIR, 'titles.json');
  const titlesContent = await fs.readFile(titlesFile, 'utf8');
  const titlesData = JSON.parse(titlesContent) as { titles?: Record<string, Title> };
  const titlesMap: Record<string, Title> = titlesData.titles || {};

  if (agencyShortName) {
    // processAgency may perform I/O (calls fetchAndSaveTitles), so await it.
    // eslint-disable-next-line no-await-in-loop
    await processAgency(agencyShortName, agenciesMap, titlesMap);
  }
  else {
    // No specific agency requested: process all agencies sequentially.
    // Sequential processing avoids overwhelming upstream services or local I/O.
    const keys = Object.keys(agenciesMap);
    console.log(`No short name provided — processing all ${keys.length} agencies sequentially.`);
    for (const key of keys) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await processAgency(key, agenciesMap, titlesMap);
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
async function processAgency(shortName: string | undefined, map: Record<string, Agency>, titlesMap: Record<string, Title>) {
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
