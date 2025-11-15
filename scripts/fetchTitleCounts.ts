// fetchTitleCounts.ts
import * as fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './config';
import { getTitleCountsArray } from './agencyUtils';

// Fetch, log and persist the title counts (array form) to disk.
export async function fetchTitleCounts(agency_slug: string) {
  const counts = await getTitleCountsArray(agency_slug);
  if (!counts || counts.length === 0) {
    console.log('No title count data found');
    return [];
  }

  counts.forEach(({ title, count }) => {
    console.log(`Title: ${title}, Modification Count: ${count}`);
  });

  // persist the title counts to the repository-level data directory as an array
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, `${agency_slug}_title_counts.json`);
  await fs.writeFile(outPath, JSON.stringify(counts, null, 2));
  console.log(`Wrote title counts to ${outPath}`);
  return counts;
}

// Get agency_slug from command line args, default to "advisory-council-on-historic-preservation"
const agency_slug = process.argv[2] || 'advisory-council-on-historic-preservation';
fetchTitleCounts(agency_slug).catch(err => {
  console.error('Error fetching title counts:', err);
});

