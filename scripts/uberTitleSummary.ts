// uberTitleSummary.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import { getTitleSummary } from './titleUtils';

// Get titles and dates
async function fetchTitleList() {
  const url = 'https://www.ecfr.gov/api/versioner/v1/titles.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  // Each entry: {number, name, latest_issue_date}
  return data.titles.map((t: any) => ({
    number: t.number,
    name: t.name,
    dateString: t.latest_issue_date
  }));
}

async function uberSummary() {
  const titles = await fetchTitleList();
  const summary: any[] = [];
  for (const { number, name, dateString } of titles) {
    console.log(`Processing Title ${number} (${name}), date: ${dateString}`);
    try {
      const result = await getTitleSummary(number, dateString);
      summary.push({
        number,
        name,
        dateString,
        checksum: result.checksum,
        wordCount: result.wordCount
      });
    } catch (err) {
      console.error(`Error processing Title ${number}:`, err);
      summary.push({
        number,
        name,
        dateString,
        error: err.message
      });
    }
  }
  await fs.writeFile('titles.summary.json', JSON.stringify(summary, null, 2));
  console.log('Wrote titles.summary.json');
}

uberSummary().catch(err => {
  console.error('Uber summary script failed:', err);
});

