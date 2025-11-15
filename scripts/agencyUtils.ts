// agencyUtils.ts
import fetch from 'node-fetch';
import type { Agency } from './model/agencyTypes';

// Call ECFR and return an array of { title, count } for the given agency slug.
export async function getTitleCountsArray(agency_slug: string): Promise<Array<{ title: number; count: number }>> {
  const url = `https://www.ecfr.gov/api/search/v1/counts/titles?agency_slugs%5B%5D=${encodeURIComponent(agency_slug)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (!data.titles || typeof data.titles !== 'object') {
    console.log('No title count data found');
    return [];
  }

  // Convert the titles map into an array of numeric title and numeric count
  return Object.entries(data.titles).map(([title, modificationCount]) => ({
    title: Number(title),
    count: Number(modificationCount)
  }));
}

// Process an Agency object: call ECFR to get title counts for the agency's slug.
export async function processAgency(agency: Agency): Promise<Array<{ title: number; count: number }>> {
  if (!agency || !agency.slug) throw new Error('Agency object missing slug');
  const counts = await getTitleCountsArray(agency.slug);
  return counts;
}
