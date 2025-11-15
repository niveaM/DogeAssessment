// fetchTitleCounts.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './config';

async function fetchTitleCounts(agency_slug: string) {
  const url = `https://www.ecfr.gov/api/search/v1/counts/titles?agency_slugs%5B%5D=${encodeURIComponent(agency_slug)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (!data.titles || typeof data.titles !== 'object') {
    console.log('No title count data found');
    return [];
  }
  Object.entries(data.titles).forEach(([title, modificationCount]) => {
    console.log(`Title: ${title}, Modification Count: ${modificationCount}`);
  });
  // persist the title counts to the repository-level data directory
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, `${agency_slug}_title_counts.json`);
  await fs.writeFile(outPath, JSON.stringify(data.titles, null, 2));
  console.log(`Wrote title counts to ${outPath}`);
  return data.titles;
}

// Get agency_slug from command line args, default to "advisory-council-on-historic-preservation"
const agency_slug = process.argv[2] || "advisory-council-on-historic-preservation";
fetchTitleCounts(agency_slug).catch(err => {
  console.error('Error fetching title counts:', err);
});

