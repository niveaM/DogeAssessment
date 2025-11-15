// agencyUtils.ts
import fetch from 'node-fetch';
import type { Agency } from './model/agencyTypes';
import type { Title } from './model/titlesTypes';
import type { HierarchyNode } from './model/hierarchyTypes';


// Walks the hierarchy recursively
function walkHierarchy(
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

  // Recursion on children
  if (Array.isArray(node.children) && node.children.length) {
    return node.children.flatMap((child: any) =>
      walkHierarchy(child, newLevels, newHeadings, newPath)
    );
  }
  // Leaf node
  return [{
    path: newPath.filter(Boolean).join(' > '),
    levels: newLevels,
    headings: newHeadings,
    type: currentLevel,
    count: currentNodeCount,
    max_score: node.max_score ?? 0,
  }];
}

// Fetch and persist hierarchy paths for an agency slug.
export async function extractHierarchy(agency_slug: string): Promise<HierarchyNode[]> {
  const api_url = `https://www.ecfr.gov/api/search/v1/counts/hierarchy?agency_slugs%5B%5D=${encodeURIComponent(agency_slug)}`;
  const res = await fetch(api_url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.children)) {
    throw new Error('No hierarchy children found in response.');
  }

  const output: HierarchyNode[] = data.children.flatMap((node: any) =>
    walkHierarchy(node)
  );

  return output;
}

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
