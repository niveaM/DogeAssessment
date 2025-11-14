// fetchTitles.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './config';
// import { TitlesResponse } from './titlesTypes'; // Optional if using types

const API_URL = 'https://www.ecfr.gov/api/versioner/v1/titles.json';

async function fetchAndSaveTitles() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  // const data: TitlesResponse = await res.json(); // For strong typing
  const data = await res.json();
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, 'titles.json');
  await fs.writeFile(outPath, JSON.stringify(data, null, 2));
  console.log(`Fetched and saved titles to ${outPath}`);
}

fetchAndSaveTitles().catch((err) => {
  console.error('Error fetching titles:', err);
});

