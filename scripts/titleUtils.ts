// titleUtils.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';
import * as crypto from 'crypto';
import type { Title, TitlesResponse, TitlesFile } from './model/titlesTypes';
import type { CFRReference, Agency } from './model/agencyTypes';
import { getSearchCountForTitle } from './agencyUtils';
import { fetchTitleAndChapterCounts, TitleChapterCountsResult } from './fetchTitleChapterCounts';
import { extractChapterChecksum } from './chapterUtils';
import type { TitleVersionsResponse, TitleVersionSummary } from './model/ecfrTypesTitleVersions';
import { addOrUpdateTitles, clearTitles, getTitles } from './db/titleDatabaseHelper';
import { writeTitleDetailsDb } from './db/titleDetailsDatabaseHelper';

// Aggregated search counts collected during processing.
export const aggregatedSearchCounts: Array<{ title: number; searchCount: number; agencySlug?: string }> = [];

// Strip XML tags and count words
export function countWords(xml: string): number {
  const text = xml.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

export function checksumXML(xml: string): string {
  return crypto.createHash('sha256').update(xml).digest('hex');
}

export async function getTitleStats(
  titleObj: Title,
  agency?: Agency
): Promise<Title> {
  const dateString = titleObj.latest_issue_date ?? "latest";
  const url = `https://www.ecfr.gov/api/versioner/v1/full/${dateString}/title-${titleObj.number}.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const xml = await res.text();

  const merged: Title = { ...titleObj };
  merged.checksum = checksumXML(xml);
  merged.wordCount = countWords(xml);

  if (agency?.slug) merged.agencySlug = agency.slug;

  return merged;
}

/** Populate TitleVersionSummary */
export async function fetchTitleVersionsSummary(titleObj: Title, target?: CFRReference, agency?: Agency): Promise<Title> {
  console.log(`fetchTitleVersionsSummary :: Fetching versions for Title ${titleObj.number} (${titleObj.name})`);
  const url = buildUrl(titleObj, target);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: TitleVersionsResponse = await res.json();

  console.log(`Fetched ${data.content_versions.length} ${JSON.stringify(data.meta)} versions for Title ${titleObj.number}`);

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

  const merged: Title = { ...titleObj };
  merged.versionSummary = versionSummary;
  if (agency?.slug) merged.agencySlug = agency.slug;

  return merged;
}

export async function getTitleStatsForAgency(
  titleObj: Title,
  agency?: Agency,
  target?: CFRReference
): Promise<Title> {

  console.log(`================================`);

  // If an agency and a specific chapter are provided, trigger the
  // chapter-level extraction/checksum work.
  let merged: Title = { ...titleObj };  
  if (agency?.slug && target?.chapter) {
    try {
        const chapterId = String(target.chapter);  
        merged = await extractChapterChecksum(merged, chapterId, agency.slug);

        console.log(`${JSON.stringify(merged)}`);
        console.log(`####### merged.checksum, merged.wordCount`, merged.checksum, merged.wordCount);
    } catch (err) {
      merged.debug = { ...(merged.debug || {}), agencySearchError: String(err) };
    }
  }

  console.log(`================================`);

  return merged;
}

export async function processTitle(titleObj: Title, target?: CFRReference, agency?: Agency): Promise<Title> {
  console.log(`processTitle :: Processing Title ${titleObj.number} (${titleObj.name})`);
  // start with a shallow clone so we can attach fields on error path
  let merged: Title = { ...titleObj };

  // Basic validation
  if (merged.number == null || !merged.name) {
    merged.debug = { ...(merged.debug || {}), error: 'Title object missing number or name' };
    return merged;
  }
  if (agency?.slug) merged.agencySlug = agency.slug;

  // If an Agency is provided, fetch title/chapter counts and attach to Title
  if (agency?.slug) {
    try {
      // Use the specialized helper that returns counts for the title and chapter
      // context. Pass the current title number (as string) and the requested
      // chapter (if any) from the `target` CFRReference parameter.
      const targetTitle = String(titleObj.number);
      const targetChapter = (target && target.chapter) ? String(target.chapter) : '';
      const counts: TitleChapterCountsResult = await fetchTitleAndChapterCounts(
        agency.slug,
        targetTitle,
        targetChapter
      );
      // Attach the returned counts object to the merged Title.
      // @ts-ignore -- we've added `titleChapterCounts` to the Title type
      merged.titleChapterCounts = counts;
    } catch (err) {
      merged.debug = { ...(merged.debug || {}), agencySearchError: String(err) };
    }
  }

  try {
    // Pass the CFRReference `target` to getTitleStats (we no longer accept Agency here)
    // merged = await getTitleStats(titleObj, agency);

    merged = await getTitleStatsForAgency(merged, agency, target);
  } catch (err) {
    merged.debug = { ...(merged.debug || {}), agencySearchError: String(err) };
  }

  // Fetch and attach single-title search count for the agency (if provided)
  try {
    const count = await getSearchCountForTitle(agency, titleObj);
    merged.searchCount = count;
    aggregatedSearchCounts.push({ title: merged.number, searchCount: count, agencySlug: agency.slug });
  } catch (err) {
    merged.debug = { ...(merged.debug || {}), agencySearchError: String(err) };
  }

  try {
    // attach versions summary
    // eslint-disable-next-line no-await-in-loop
    merged = await fetchTitleVersionsSummary(merged, target, agency);
    // no additional sanity-check — merged preserves the original title number
  } catch (err: any) {
    merged.debug = { ...(merged.debug || {}), error: err?.message || String(err) };
  }
  console.log(
    `After getTitleStatsForAgency: ${merged.wordCount} ${merged.checksum}`
  );
  return merged;
}

export async function fetchAndSaveTitles(titleObj: Title, target?: CFRReference, agency?: Agency): Promise<Title> {
  if (!titleObj || titleObj.number == null) throw new Error('fetchAndSaveTitles requires a Title object as the first argument');
  // Ensure per-title directory exists
  const perTitleDir = path.join(DATA_DIR, 'title');
  await fs.mkdir(perTitleDir, { recursive: true });

  console.log(`Processing Title ${titleObj.number} (${titleObj.name})`);
  // sequential processing to avoid hammering API
  // Use the provided Agency object directly (if provided).
  // eslint-disable-next-line no-await-in-loop
  const merged = await processTitle(titleObj, target, agency);

  // write individual file for this title (filename includes agency short_name when present)
  // const agencyIdForFile = agency?.short_name ?? '-';
  // const safeAgency = agencyIdForFile ? String(agencyIdForFile).replace(/[^a-z0-9-_\.]/gi, '_') : '';
  // const fileName = safeAgency ? `${String(merged.number)}.${safeAgency}.json` : `${String(merged.number)}.json`;
  // const outFile = path.join(perTitleDir, fileName);
  // // eslint-disable-next-line no-await-in-loop
  // await fs.writeFile(outFile, JSON.stringify(merged, null, 2));
  // console.log(`Wrote title ${merged.number} to ${outFile}`);

  console.log(`Processed and wrote title(s) to ${perTitleDir}`);

  await writeTitleDetailsDb(merged);
  console.log(
    `After fetchAndSaveTitles: ${merged.wordCount} ${merged.checksum}`
  );
  return merged;
}

// Load titles.json from DATA_DIR and return a map of Title objects keyed by
// their identifier (string). Returns an empty object if the file is missing
// or invalid.
export async function loadTitlesMap(): Promise<void> {
  console.log('loadTitlesMap: called');
  // Prefer the centralized titles DB helper which handles reading the cached
  // titles map. If the helper returns an empty map, fall back to fetching
  // from the upstream ECFR API and persist the results via the helper.
  try {
    const existing = await getTitles();
    if (existing && Object.keys(existing).length) {
      console.log(`loadTitlesMap: cache hit — ${Object.keys(existing).length} titles`);
      return;
    }
    console.log('loadTitlesMap: cache empty — will fetch from ECFR');
  } catch (err: any) {
    console.warn('loadTitlesMap: error reading cache, will fetch:', err?.message || err);
  }

  const API_URL = 'https://www.ecfr.gov/api/versioner/v1/titles.json';
  try {
    console.log(`loadTitlesMap: fetching titles from ${API_URL}`);
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data: TitlesResponse = await res.json();

    try {
      // Persist fetched titles via the DB helper
      await clearTitles();
      await addOrUpdateTitles(data.titles);
      console.log(`loadTitlesMap: persisted ${data.titles.length} titles via helper`);
    } catch (err: any) {
      console.warn('loadTitlesMap: failed to persist titles via helper:', err?.message || err);
    }

  
    return;
  } catch (err: any) {
    console.warn('loadTitlesMap: failed to fetch titles from ECFR:', err?.message || err);
    return;
  }
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

