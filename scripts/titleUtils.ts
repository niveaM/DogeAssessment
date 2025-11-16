// titleUtils.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';
import * as crypto from 'crypto';
import type { Title, TitlesResponse, TitlesFile } from './model/titlesTypes';
import type { CFRReference, Agency } from './model/agencyTypes';
import { getSearchCountForTitle } from './agencyUtils';
import { fetchTitleAndChapterCounts } from './fetchTitleChapterCounts';
import type { TitleVersionsResponse, TitleVersionSummary } from './model/ecfrTypesTitleVersions';

// Aggregated search counts collected during processing. Each entry represents
// the number of search results (modification count) for a given title and
// agency. This is written out by `fetchAndSaveTitles` so callers can inspect
// cumulative results.
export const aggregatedSearchCounts: Array<{ title: number; searchCount: number; agencySlug?: string }> = [];

// Strip XML tags and count words
export function countWords(xml: string): number {
  const text = xml.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

export function checksumXML(xml: string): string {
  return crypto.createHash('sha256').update(xml).digest('hex');
}

// Core: fetch XML, compute summary, return typed TitleSummary
// Now accepts the raw Title object, fetches the full XML, computes checksum/wordCount
// and returns the merged Title object (original fields + summary fields).
export async function getTitleStats(titleObj: Title, agency?: Agency): Promise<Title> {
  const dateString = titleObj.latest_issue_date ?? 'latest';
  const url = `https://www.ecfr.gov/api/versioner/v1/full/${dateString}/title-${titleObj.number}.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const xml = await res.text();

  const merged: Title = { ...titleObj };
  merged.checksum = checksumXML(xml);
  merged.wordCount = countWords(xml);

  // // also keep a compact document-level summary on the Title object under
  // // `debug` so consumers can inspect it without polluting the top-level shape.
  // merged.debug = {
  //   ...(merged.debug || {}),
  //   titleDocumentSummary: {
  //     titleNumber: titleObj.number,
  //     dateString,
  //     checksum,
  //     wordCount,
  //   }
  // };
  // merged.dateString = titleObj.latest_issue_date;
  if (agency?.slug) merged.agencySlug = agency.slug;
  
  // if (merged.dateString !== titleObj.latest_issue_date) {
  //   merged.debug = {
  //     ...(merged.debug || {}),
  //     dateStringMismatch: {
  //       latest_issue_date: titleObj.latest_issue_date,
  //       summary_dateString: merged.dateString
  //     }
  //   };
  // }

  return merged;
}

/** Populates TitleVersionSummary */
export async function fetchTitleVersionsSummary(titleObj: Title, target?: CFRReference, agency?: Agency): Promise<Title> {
  console.log(`fetchTitleVersionsSummary :: Fetching versions for Title ${titleObj.number} (${titleObj.name})`); 
  const url = buildUrl(titleObj, target);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: TitleVersionsResponse = await res.json();

  console.log(`Fetched ${data.content_versions.length} ${JSON.stringify(data.meta)} versions for Title ${titleObj.number}`);

  // Generate summary
  const totalVersions = data.content_versions.length;
  const sortedByDate = [...data.content_versions].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = sortedByDate[0]?.date ?? '';
  const lastDate = sortedByDate[totalVersions - 1]?.date ?? '';

  const partSet = new Set<string>();
  const subpartSet = new Set<string>();
  const typeCounts: Record<string, number> = {};

  data.content_versions.forEach(v => {
    if (v.part) partSet.add(v.part);
    if (v.subpart) subpartSet.add(v.subpart ?? '');
    typeCounts[v.type] = (typeCounts[v.type] || 0) + 1;
  });

  const versionSummary: TitleVersionSummary = {
    titleNumber: titleObj.number,
    totalVersions,
    firstDate,
    lastDate,
    uniqueParts: partSet.size,
    uniqueSubparts: subpartSet.size,
    typeCounts,
  };

  // Merge into a Title object and attach the computed versions summary.
  const merged: Title = { ...titleObj };
  merged.versionSummary = versionSummary;
  if (agency?.slug) merged.agencySlug = agency.slug;

  return merged;
}

// Helper to process one title entry and return merged object.
// Moved here from `fetchTitles.ts` so other scripts can reuse it directly.
export async function processTitle(titleObj: Title, target?: CFRReference, agency?: Agency): Promise<Title> {
  console.log(`processTitle :: Processing Title ${titleObj.number} (${titleObj.name})`);
  // start with a shallow clone so we can attach fields on error path
  let merged: Title = { ...titleObj };

  // Basic validation: ensure number and name exist
  if (merged.number == null || !merged.name) {
    merged.debug = { ...(merged.debug || {}), error: 'Title object missing number or name' };
    return merged;
  }

  try {
    merged = await getTitleStats(titleObj, agency);
  } catch (err) {
    merged.debug = { ...(merged.debug || {}), agencySearchError: String(err) };
  }

  // If an Agency object is provided, attempt to extract the agency's
  // CFR hierarchy and attach it to the Title object so downstream tools
  // can inspect hierarchy paths that reference this title.
  if (agency?.slug) {
    try {
      // Use the specialized helper that returns counts for the title and chapter
      // context. Pass the current title number (as string) and the requested
      // chapter (if any) from the `target` CFRReference parameter.
      const targetTitle = String(titleObj.number);
      const targetChapter = (target && target.chapter) ? String(target.chapter) : '';
      const counts = await fetchTitleAndChapterCounts(agency.slug, targetTitle, targetChapter);
      // Attach the returned counts object to the merged Title so callers can
      // inspect title/chapter level counts and the raw API response.
      // @ts-ignore -- we've added `titleChapterCounts` to the Title type
      merged.titleChapterCounts = counts;
    } catch (err) {
      merged.debug = { ...(merged.debug || {}), agencySearchError: String(err) };
    }
  }

  // If an Agency object is provided, fetch its title counts and attach the
  // count for this single title as `searchCount` on the merged Title.
  try {
    const count = await getSearchCountForTitle(agency, titleObj);
    merged.searchCount = count;
    aggregatedSearchCounts.push({ title: merged.number, searchCount: count, agencySlug: agency.slug });




  } catch (err) {
    merged.debug = { ...(merged.debug || {}), agencySearchError: String(err) };
  }

  try {
    // attach versions summary by passing the merged Title into the helper
    // (this may add `summary` or `versionsSummary` depending on implementation)
    // eslint-disable-next-line no-await-in-loop
    merged = await fetchTitleVersionsSummary(merged, target, agency);
    // no additional sanity-check — merged preserves the original title number
  } catch (err: any) {
    merged.debug = { ...(merged.debug || {}), error: err?.message || String(err) };
  }

  return merged;
}

// Processes either a single title (by number) or all titles and writes
// per-title JSON files into the data directory. Exported so other scripts
// (including `fetchTitles.ts`) can reuse it.
export async function fetchAndSaveTitles(titleObj: Title, target?: CFRReference, agency?: Agency): Promise<Title> {
  // The caller must provide a fully-typed Title object (pulled from data/titles.json).
  if (!titleObj || titleObj.number == null) throw new Error('fetchAndSaveTitles requires a Title object as the first argument');

  // Ensure per-title directory exists
  const perTitleDir = path.join(DATA_DIR, 'title');
  await fs.mkdir(perTitleDir, { recursive: true });

  console.log(`Processing Title ${titleObj.number} (${titleObj.name})`);
  // sequential processing to avoid hammering API
  // Use the provided Agency object directly (if provided).
  // eslint-disable-next-line no-await-in-loop
  const merged = await processTitle(titleObj, target, agency);

  // write individual file for this title
  // include agencySlug in the filename when provided, sanitized for filesystem safety
  const agencyIdForFile = agency?.short_name ?? '-';
  const safeAgency = agencyIdForFile ? String(agencyIdForFile).replace(/[^a-z0-9-_\.]/gi, '_') : '';
  const fileName = safeAgency ? `${String(merged.number)}.${safeAgency}.json` : `${String(merged.number)}.json`;
  const outFile = path.join(perTitleDir, fileName);
  // eslint-disable-next-line no-await-in-loop
  await fs.writeFile(outFile, JSON.stringify(merged, null, 2));
  console.log(`Wrote title ${merged.number} to ${outFile}`);
  /* // Also persist the aggregated search counts collected so far so callers can
  // inspect cumulative search counts across processed titles.
  try {
    const aggPath = path.join(DATA_DIR, 'title_search_counts.json');
    await fs.writeFile(aggPath, JSON.stringify(aggregatedSearchCounts, null, 2));
    console.log(`Wrote aggregated search counts to ${aggPath}`);
  } catch (err) {
    console.warn('Failed to write aggregated search counts:', err);
  } */


  console.log(`Processed and wrote title(s) to ${perTitleDir}`);
  return merged;
}


function buildUrl(titleObj: Title, target?: CFRReference) {
  console.log(`buildUrl :: Building URL for Title ${titleObj.number} (${JSON.stringify(target)})`);
  const base = `https://www.ecfr.gov/api/versioner/v1/versions/title-${titleObj.number}.json`;
  if (target && target.chapter) {
    // chapter may already be roman or numeric; ensure it's URI encoded
    const url =  `${base}?chapter=${encodeURIComponent(String(target.chapter))}`;
    console.log(`Fetching versions for title ${url}`);
    return url;
  }
  console.log(`No chapter specified for title ${titleObj.number}, fetching all versions`);
  return base;
}

