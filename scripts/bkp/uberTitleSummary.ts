// uberTitleSummary.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './../config';
import { getTitleStats } from './../titleUtils';
import type { TitlesResponse, Title } from './../model/titlesTypes';

// Get titles and dates
async function fetchTitleList(): Promise<Title[]> {
  const url = 'https://www.ecfr.gov/api/versioner/v1/titles.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: TitlesResponse = await res.json();
  return data.titles || [];
}

async function uberSummary() {
  const titles = await fetchTitleList();
  // store full Title objects (merged) in the summary file
  const summary: Title[] = [];
  for (const t of titles) {
    console.log(`Processing Title ${t.number} (${t.name}), date: ${t.latest_issue_date}`);
    try {
      const merged: Title = await getTitleStats(t);
      // push the full merged Title object
      summary.push(merged);
    } catch (err: any) {
      console.error(`Error processing Title ${t.number}:`, err);
  // push the original Title annotated with the error (into debug)
  const errObj: Title = { ...t, debug: { ...(t as any).debug, error: err?.message || String(err) } };
  summary.push(errObj);
    }
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, 'titles.summary.json');
  await fs.writeFile(outPath, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${outPath}`);
}

uberSummary().catch(err => {
  console.error('Uber summary script failed:', err);
});
