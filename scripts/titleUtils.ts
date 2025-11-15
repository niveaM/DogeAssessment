// titleUtils.ts
import fetch from 'node-fetch';
import * as crypto from 'crypto';
import type { Title } from './model/titlesTypes';
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

export async function fetchTitleVersionsWithSummary(titleObj: Title, agencySlug?: string): Promise<Title> {
  const titleNumber = titleObj.number;
  const url = `https://www.ecfr.gov/api/versioner/v1/versions/title-${titleNumber}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: TitleVersionsResponse = await res.json();

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
    titleNumber,
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


