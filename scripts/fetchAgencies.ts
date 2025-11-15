// fetchAgencies.ts
import fetch from 'node-fetch';
import { AgenciesResponse, Agency } from './model/agencyTypes';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';

const API_URL = 'https://www.ecfr.gov/api/admin/v1/agencies.json';

async function fetchAndSaveAgencies() {
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

  // ensure data directory exists, then write the file into it
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, 'agencies.json');
  await fs.writeFile(outPath, JSON.stringify(agenciesMap, null, 2));
  console.log(`Fetched and saved agencies map (${Object.keys(agenciesMap).length} entries) to ${outPath}`);
}

fetchAndSaveAgencies().catch((err) => {
  console.error('Error fetching agencies:', err);
});
