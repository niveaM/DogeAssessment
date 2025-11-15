// titleUtils.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_DIR } from './config';
import * as crypto from 'crypto';
import type { Title, TitlesResponse, TitlesFile } from './model/titlesTypes';
import type { CFRReference } from './model/agencyTypes';
import type { TitleVersionsResponse, TitleVersionSummary } from './model/ecfrTypesTitleVersions';

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
export async function getTitleSummary(titleObj: Title, agencySlug?: string): Promise<Title> {
  const dateString = titleObj.latest_issue_date ?? 'latest';
  const url = `https://www.ecfr.gov/api/versioner/v1/full/${dateString}/title-${titleObj.number}.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const xml = await res.text();

  const checksum = checksumXML(xml);
  const wordCount = countWords(xml);

  const merged: Title = { ...titleObj };
  merged.checksum = checksum;
  merged.wordCount = wordCount;
  // also keep a compact document-level summary on the Title object under
  // `debug` so consumers can inspect it without polluting the top-level shape.
  merged.debug = {
    ...(merged.debug || {}),
    titleDocumentSummary: {
      titleNumber: titleObj.number,
      dateString,
      checksum,
      wordCount,
    }
  };
  merged.dateString = titleObj.latest_issue_date;
  if (agencySlug) merged.agencySlug = agencySlug;

  if (merged.dateString !== titleObj.latest_issue_date) {
    merged.debug = {
      ...(merged.debug || {}),
      dateStringMismatch: {
        latest_issue_date: titleObj.latest_issue_date,
        summary_dateString: merged.dateString
      }
    };
  }

  return merged;
}

export async function fetchTitleVersionsWithSummary(titleObj: Title, target?: CFRReference, agencySlug?: string): Promise<Title> {
  console.log(`fetchTitleVersionsWithSummary :: Fetching versions for Title ${titleObj.number} (${titleObj.name})`); 
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
  if (agencySlug) merged.agencySlug = agencySlug;

  return merged;
}

// Helper to process one title entry and return merged object.
// Moved here from `fetchTitles.ts` so other scripts can reuse it directly.
export async function processTitle(titleObj: Title, target?: CFRReference, agencySlug?: string): Promise<Title> {
  console.log(`processTitle :: Processing Title ${titleObj.number} (${titleObj.name})`);
  // start with a shallow clone so we can attach fields on error path
  let merged: Title = { ...titleObj };

  // Basic validation: ensure number and name exist
  if (merged.number == null || !merged.name) {
    merged.debug = { ...(merged.debug || {}), error: 'Title object missing number or name' };
    return merged;
  }

  try {
    merged = await getTitleSummary(titleObj, agencySlug);
    // attach versions summary by passing the merged Title into the helper
    // (this may add `summary` or `versionsSummary` depending on implementation)
    // eslint-disable-next-line no-await-in-loop
    merged = await fetchTitleVersionsWithSummary(merged, target, agencySlug);
    // no additional sanity-check — merged preserves the original title number
    return merged;
  } catch (err: any) {
    merged.debug = { ...(merged.debug || {}), error: err?.message || String(err) };
    return merged;
  }
}

// Processes either a single title (by number) or all titles and writes
// per-title JSON files into the data directory. Exported so other scripts
// (including `fetchTitles.ts`) can reuse it.
export async function fetchAndSaveTitles(cfrReference: CFRReference, agencySlug?: string) {
  // Read titles data from the local data directory instead of fetching from ECFR.
  const titlesFile = path.join(DATA_DIR, 'titles.json');
  const fileContent = await fs.readFile(titlesFile, 'utf8');
  const data: TitlesFile = JSON.parse(fileContent);

  // The on-disk `titles.json` is a map keyed by title number.
  const titlesMap: Record<string, Title> = data.titles || {};

  // target is a CFRReference object — use it directly
  const titleObj: Title | undefined = titlesMap[String(cfrReference.title)];
  if (!titleObj) throw new Error(`Title ${cfrReference.title} not found in titles.json`);

  // Ensure per-title directory exists
  const perTitleDir = path.join(DATA_DIR, 'title');
  // await fs.mkdir(perTitleDir, { recursive: true });

    console.log(`Processing Title ${titleObj.number} (${titleObj.name})`);
    // sequential processing to avoid hammering API
  // eslint-disable-next-line no-await-in-loop
  const merged = await processTitle(titleObj, cfrReference, agencySlug);

  // write individual file for this title
  // include agencySlug in the filename when provided, sanitized for filesystem safety
  const safeAgency = agencySlug ? String(agencySlug).replace(/[^a-z0-9-_\.]/gi, '_') : '';
  const fileName = safeAgency ? `${String(merged.number)}.${safeAgency}.json` : `${String(merged.number)}.json`;
  const outFile = path.join(perTitleDir, fileName);
  // eslint-disable-next-line no-await-in-loop
  await fs.writeFile(outFile, JSON.stringify(merged, null, 2));
  console.log(`Wrote title ${merged.number} to ${outFile}`);


  console.log(`Processed and wrote title(s) to ${perTitleDir}`);
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

