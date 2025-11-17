import fetch from 'node-fetch';
import * as crypto from 'crypto';
import type { Title } from './model/titlesTypes';
import type { CFRReference } from './model/agencyTypes';
import type { TitleVersionsResponse, TitleVersionSummary } from './model/ecfrTypesTitleVersions';

/**
 * Strip XML tags and count words
 */
export function countWords(xml: string): number {
  const text = xml.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

export function checksumXML(xml: string): string {
  return crypto.createHash('sha256').update(xml).digest('hex');
}

export async function getTitleStats(
  titleObj: Title,
  agency?: { slug?: string }
): Promise<Title> {
  const dateString = titleObj.latest_issue_date ?? 'latest';
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

function buildUrl(titleObj: Title, target?: CFRReference) {
  const base = `https://www.ecfr.gov/api/versioner/v1/versions/title-${titleObj.number}.json`;
  if (target && target.chapter) {
    const url = `${base}?chapter=${encodeURIComponent(String(target.chapter))}`;
    return url;
  }
  return base;
}

/**
 * Convert a TitleVersionsResponse into a compact TitleVersionSummary.
 */
export function titleVersionsResponseToSummary(data: TitleVersionsResponse, titleNumber: number): TitleVersionSummary {
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

  return {
    titleNumber,
    totalVersions,
    firstDate,
    lastDate,
    uniqueParts: partSet.size,
    uniqueSubparts: subpartSet.size,
    typeCounts,
  };
}

/** Populate TitleVersionSummary by fetching the ECFR versions endpoint */
export async function fetchTitleVersionsSummary(titleObj: Title, target?: CFRReference, _agency?: any): Promise<Title> {
  const url = buildUrl(titleObj, target);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: TitleVersionsResponse = await res.json();

  const versionSummary: TitleVersionSummary = titleVersionsResponseToSummary(data, titleObj.number);

  const merged: Title = { ...titleObj };
  merged.versionSummary = versionSummary;
  if (_agency?.slug) merged.agencySlug = _agency.slug;

  return merged;
}
