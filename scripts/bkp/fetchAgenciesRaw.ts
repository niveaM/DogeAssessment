// fetchAgencies.ts
import fetch from 'node-fetch';
import { AgenciesResponse } from './../model/agencyTypes';
import * as fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './../config';

const API_URL = 'https://www.ecfr.gov/api/admin/v1/agencies.json';

async function fetchAndSaveAgencies() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: AgenciesResponse = await res.json();
  // ensure data directory exists, then write the file into it
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, 'agencies.json');
  await fs.writeFile(outPath, JSON.stringify(data, null, 2));
  console.log(`Fetched and saved agencies to ${outPath}`);
}

fetchAndSaveAgencies().catch((err) => {
  console.error('Error fetching agencies:', err);
});
