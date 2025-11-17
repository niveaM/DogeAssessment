// titleUtils.ts
import fetch from "node-fetch";
import * as fs from "fs/promises";
import * as path from "path";
import { DATA_DIR } from "../config";
import type {
  Title,
  TitlesResponse,
  TitlesFile,
} from "../model/titleTypes";
import type { CFRReference, Agency } from "../model/agencyTypes";
import { getSearchCountForTitle } from "./agencyUtils";
import { fetchTitleAndChapterCounts } from "../../scripts/fetchTitleChapterCounts";
import type { TitleChapterCountsResult } from "../model/hierarchyTypes";
import { extractChapterChecksum, extractChapterVersionSummary } from "./chapterUtils";
import type {
  TitleVersionSummary,
} from "../model/titleTypes";
import {
  getTitleVersionSummary,
  getTitleStats,
  buildUrl,
} from "./commonUtils";
import {
  addOrUpdateTitles,
  clearTitles,
  getTitles,
} from "../db/titleDatabaseHelper";
import { writeTitleDetailsDb } from "../db/titleDetailsDatabaseHelper";

// Aggregated search counts collected during processing.
export const aggregatedSearchCounts: Array<{
  title: number;
  searchCount: number;
  agencySlug?: string;
}> = [];

// getTitleStats moved to ./commonUtils

// fetchTitleVersionsSummary has been moved to ./commonUtils

/**
 * Similar to `fetchTitleVersionsSummary` but uses chapter-level extraction when
 * an agency and chapter are provided. This mirrors the approach taken in
 * `getTitleStatsForAgency` which uses `extractChapterChecksum` from
 * `chapterUtils` to handle chapter-level processing.
 */
export async function fetchTitleVersionsSummaryForAgency(
  titleObj: Title,
  target?: CFRReference,
  agency?: Agency
): Promise<Title> {
  console.log(
    `fetchTitleVersionsSummaryForAgency :: Fetching versions for Title ${titleObj.number} (${titleObj.name}) with agency ${agency?.slug}`
  );

  // If agency and chapter are provided, prefer to run the chapter-level
  // extraction which will populate checksum/wordCount and other debug info.
  let merged: Title = { ...titleObj };
  if (agency?.slug && target?.chapter) {
    try {
      const chapterId = String(target.chapter);
      merged = await extractChapterVersionSummary(
        merged,
        chapterId,
        agency.slug
      );
    } catch (err) {
      merged.debug = {
        ...(merged.debug || {}),
        agencySearchError: "extractChapterVersionSummary " + String(err),
      };
    }
  }

  // Regardless of chapter-level processing above, fetch the versions summary
  // from the ECFR API to populate the versionSummary fields. Use the existing
  // buildUrl helper so it will include chapter query when appropriate.
  try {
    const versionSummary: TitleVersionSummary = await getTitleVersionSummary(
      titleObj.number,
      target && target.chapter ? String(target.chapter) : undefined
    );

    merged = { ...merged };
    merged.versionSummary = versionSummary;
    if (agency?.slug) merged.agencySlug = agency.slug;
  } catch (err: any) {
      merged.debug = {
        ...(merged.debug || {}),
        agencySearchError:
          "fetchTitleVersionsSummaryForAgency" + err?.message || String(err),
      };
  }

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

      // console.log(`${JSON.stringify(merged)}`);
      console.log(
        `####### merged.checksum, merged.wordCount`,
        merged.checksum,
        merged.wordCount
      );
    } catch (err) {
      merged.debug = {
        ...(merged.debug || {}),
        agencySearchError: "getTitleStatsForAgency " + String(err),
      };
    }
  }

  console.log(`================================`);

  return merged;
}

export async function processTitle(
  titleObj: Title,
  target?: CFRReference,
  agency?: Agency
): Promise<Title> {
  console.log(
    `processTitle :: Processing Title ${titleObj.number} (${titleObj.name})`
  );
  // start with a shallow clone so we can attach fields on error path
  let merged: Title = { ...titleObj };

  // Basic validation
  if (merged.number == null || !merged.name) {
    merged.debug = {
      ...(merged.debug || {}),
      error: "Title object missing number or name",
    };
    return merged;
  }
  if (agency?.slug) merged.agencySlug = agency.slug;
  if (target?.chapter) merged.chapter = target.chapter;

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
    merged = await fetchTitleVersionsSummaryForAgency(merged, target, agency);
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

// buildUrl moved to ./commonUtils
