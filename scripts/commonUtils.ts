import fetch from 'node-fetch';
import * as crypto from 'crypto';
import type { Title } from '../src/model/titlesTypes';
import type { CFRReference } from '../src/model/agencyTypes';
import type { TitleVersionsResponse, TitleVersionSummary } from '../src/model/ecfrTypesTitleVersions';
import type { HierarchyNode } from '../src/model/hierarchyTypes';

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

export function buildUrl(titleObj: Title, target?: CFRReference) {
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
export async function getTitleVersionSummary(
  titleNumber: number,
  chapterId?: string,
  part?: string
): Promise<TitleVersionSummary> {
  const base = `https://www.ecfr.gov/api/versioner/v1/versions/title-${titleNumber}.json`;
  const params: string[] = [];
  if (chapterId) params.push(`chapter=${encodeURIComponent(String(chapterId))}`);
  if (part) params.push(`part=${encodeURIComponent(String(part))}`);
  const url = params.length ? `${base}?${params.join('&')}` : base;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: TitleVersionsResponse = await res.json();

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
    ...(chapterId ? { chapterId } : {}),
    // include the list of parts (possibly empty) as an array
    parts: Array.from(partSet),
  };
}

/** Populate TitleVersionSummary by fetching the ECFR versions endpoint */
export async function fetchTitleVersionsSummary(titleObj: Title, target?: CFRReference, _agency?: any): Promise<Title> {
  const versionSummary: TitleVersionSummary = await getTitleVersionSummary(
    titleObj.number,
    target && (target as CFRReference).chapter ? String((target as CFRReference).chapter) : undefined
  );

  const merged: Title = { ...titleObj };
  merged.versionSummary = versionSummary;
  if (_agency?.slug) merged.agencySlug = _agency.slug;

  return merged;
}

// Walks the hierarchy recursively and returns an array of HierarchyNode
export function walkHierarchy(
  node: any,
  parentLevels: string[] = [],
  parentHeadings: string[] = [],
  parentPath: string[] = []
): HierarchyNode[] {
  const currentLevel = node.level;
  const currentHeading = node.heading ?? '';
  const currentHierarchyHeading = node.hierarchy_heading ?? node.hierarchy ?? '';
  const currentPart = currentHierarchyHeading ? `${currentHierarchyHeading}` : '';
  const currentNodeCount = node.count ?? 0;

  const newLevels = [...parentLevels, currentLevel];
  const newHeadings = [...parentHeadings, currentHeading];
  const newPath = [...parentPath, currentPart];

  if (Array.isArray(node.children) && node.children.length) {
    return node.children.flatMap((child: any) =>
      walkHierarchy(child, newLevels, newHeadings, newPath)
    );
  }

  const pathSegments = newPath.filter(Boolean);
  const cfrPartial: Partial<CFRReference> = {};
  for (const seg of pathSegments) {
    const s = String(seg).trim();
    let m: RegExpMatchArray | null = null;
    if ((m = s.match(/^Title\s+(\d+)/i))) {
      cfrPartial.title = Number(m[1]);
      continue;
    }
    if ((m = s.match(/^Chapter\s+(.+)/i))) {
      cfrPartial.chapter = m[1].trim();
      continue;
    }
    if ((m = s.match(/^Part\s+(.+)/i))) {
      cfrPartial.part = m[1].trim();
      continue;
    }
    if ((m = s.match(/^Subpart\s+(.+)/i))) {
      cfrPartial.subpart = m[1].trim();
      continue;
    }
    if ((m = s.match(/^Subtitle\s+(.+)/i))) {
      cfrPartial.subtitle = m[1].trim();
      continue;
    }
    if ((m = s.match(/^Subchapter\s+(.+)/i))) {
      cfrPartial.subchapter = m[1].trim();
      continue;
    }
  }

  const cfrRef = typeof cfrPartial.title === 'number' ? (cfrPartial as any) : undefined;

  const metadataMap: Record<string, { level: string; heading: string; path: string; value?: string | number; displayHeading?: string }> = {};
  for (let i = 0; i < parentLevels.length; i += 1) {
    const lvl = parentLevels[i];
    metadataMap[lvl] = {
      level: lvl,
      heading: parentHeadings[i] ?? '',
      path: parentPath[i] ?? '',
      value: (cfrPartial as any)[lvl],
      displayHeading: combineHeading(
        parentPath[i] ?? '', 
        parentHeadings[i] ?? ''),
    };
  }

  return [
    {
      path: pathSegments.join(' > '),
      type: currentLevel,
      count: currentNodeCount,
      max_score: node.max_score ?? 0,
      cfrReference: cfrRef,
      metadata: metadataMap,
    },
  ];
}


export function combineHeading(a: string | null, b: string | null): string {
  if (a && b && a !== b) return `${a} | ${b}`;
  return a || b || "";
}
