// fetchAgencyCount.ts
import fetch from 'node-fetch';

async function fetchAgencyCount(agency_slug: string) {
  const url = `https://www.ecfr.gov/api/search/v1/count?agency_slugs%5B%5D=${encodeURIComponent(agency_slug)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  // data.meta.total_count is the value you want
  console.log(`Total count for agency_slug "${agency_slug}": ${data.meta.total_count}`);
  return data.meta.total_count as number;
}

// Get agency_slug from command line args, default to "advisory-council-on-historic-preservation"
const agency_slug = process.argv[2] || "advisory-council-on-historic-preservation";
fetchAgencyCount(agency_slug).catch(err => {
  console.error('Error fetching count:', err);
});
