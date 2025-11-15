// fetchTitleRaw.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './../config';
import { TitlesResponse } from './../model/titlesTypes'; // Strong typing

const API_URL = 'https://www.ecfr.gov/api/versioner/v1/titles.json';

async function fetchAndSaveTitles() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: TitlesResponse = await res.json(); // Strong typing for the response
  // Transform titles array into a map keyed by title number for faster lookups
  // Preserve meta if present
  // Expected incoming shape: { titles: Array<{ number: number, ... }>, meta?: any }
  const titlesArray: any[] = (data as any).titles ?? [];
  const titlesMap = Object.fromEntries(
    titlesArray.map((t: any) => [String(t.number), t])
  );

  const outData = {
    titles: titlesMap,
    meta: (data as any).meta ?? null,
  };

  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, 'titles.json');
  await fs.writeFile(outPath, JSON.stringify(outData, null, 2));
  console.log(`Fetched, transformed, and saved titles map to ${outPath}`);
  
}

fetchAndSaveTitles().catch((err) => {
  console.error('Error fetching titles:', err);
});
