// fetchAgencyCount.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './../config';

async function fetchAgencyCount(agency_slug: string) {
  const url = `https://www.ecfr.gov/api/search/v1/count?agency_slugs%5B%5D=${encodeURIComponent(agency_slug)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  // data.meta.total_count is the value you want
  const total = data.meta.total_count as number;
  console.log(`Total count for agency_slug "${agency_slug}": ${total}`);
  // ensure data dir exists and write a small json summary
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, `${agency_slug}_count.json`);
  await fs.writeFile(outPath, JSON.stringify({ agency_slug, total_count: total }, null, 2));
  console.log(`Saved agency count to ${outPath}`);
  return total;
}

// Get agency_slug from command line args, default to "advisory-council-on-historic-preservation"
const agency_slug = process.argv[2] || "advisory-council-on-historic-preservation";
fetchAgencyCount(agency_slug).catch(err => {
  console.error('Error fetching count:', err);
});
