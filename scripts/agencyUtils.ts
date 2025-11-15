// agencyUtils.ts
import fetch from 'node-fetch';
import type { Agency } from './model/agencyTypes';
import type { Title } from './model/titlesTypes';

// Call ECFR and return an array of { title, count } for the given agency slug.
export async function getTitleCountsArray(agency_slug: string): Promise<Array<{ title: number; count: number }>> {
  const url = `https://www.ecfr.gov/api/search/v1/counts/titles?agency_slugs%5B%5D=${encodeURIComponent(agency_slug)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (!data.titles || typeof data.titles !== 'object') {
    return [];
  }

  return Object.entries(data.titles).map(([title, modificationCount]) => ({
    title: Number(title),
    count: Number(modificationCount)
  }));
}

// Process an Agency object: call ECFR to get title counts for the agency's slug.
export async function processAgency(agency: Agency): Promise<Array<{ title: number; count: number }>> {
  if (!agency || !agency.slug) throw new Error('Agency object missing slug');
  return getTitleCountsArray(agency.slug);
}

// Return the search (modification) count for one title for the given agency.
export async function getSearchCountForTitle(agency: Agency, titleObj: Title): Promise<number> {
  if (!agency || !agency.slug) throw new Error('Agency object missing slug');
  if (!titleObj || titleObj.number == null) return 0;
  const counts = await getTitleCountsArray(agency.slug);
  const match = counts.find(c => Number(c.title) === Number(titleObj.number));
  return match ? Number(match.count) : 0;
}
