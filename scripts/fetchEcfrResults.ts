// fetchEcfrResults.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import { ECFRResultsResponse } from './model/ecfrTypes';

const API_URL =
  'https://www.ecfr.gov/api/search/v1/results?agency_slugs%5B%5D=advisory-council-on-historic-preservation&per_page=20&page=1&order=relevance&paginate_by=results';

async function fetchResults() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data: ECFRResultsResponse = await res.json();
    // ensure data directory exists and write into it
    const outPath = '../data/acph_results.json';
    await fs.writeFile(outPath, JSON.stringify(data, null, 2));
    console.log(`Results written to ${outPath}`);
  } catch (err) {
    console.error('Error fetching ECFR results:', err);
  }
}

fetchResults();
