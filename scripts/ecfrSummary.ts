// ecfrSummary.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';

// --- Types ---
interface TitleModification {
  title: string;
  modification_count: number;
}

interface HierarchyNode {
  path: string;
  levels: string[];
  headings: string[];
  type: string;
  count: number;
  max_score: number;
  title: string; // extracted from top of hierarchy path
}

// --- Fetch title modification counts ---
async function fetchTitleCounts(agency_slug: string): Promise<TitleModification[]> {
  const url = `https://www.ecfr.gov/api/search/v1/counts/titles?agency_slugs%5B%5D=${encodeURIComponent(agency_slug)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (!data.titles || typeof data.titles !== 'object') return [];
  return Object.entries(data.titles).map(
    ([title, modification_count]) => ({
      title,
      modification_count: Number(modification_count),
    })
  );
}

// --- Walk hierarchy/tree, extracting full path per leaf ---
function walkHierarchy(
  node: any,
  parentLevels: string[] = [],
  parentHeadings: string[] = [],
  parentPath: string[] = [],
  title: string = ""
): HierarchyNode[] {
  const currentLevel = node.level;
  const currentHeading = node.heading ?? '';
  const currentHierarchyHeading = node.hierarchy_heading ?? node.hierarchy ?? '';
  const currentPart = currentHierarchyHeading ? `${currentHierarchyHeading}` : '';
  const currentNodeCount = node.count ?? 0;

  const newLevels = [...parentLevels, currentLevel];
  const newHeadings = [...parentHeadings, currentHeading];
  const newPath = [...parentPath, currentPart];

  // Pass down the top-most title as identifier
  const hierarchyTitle = title || node.hierarchy || "";

  if (Array.isArray(node.children) && node.children.length) {
    return node.children.flatMap((child: any) =>
      walkHierarchy(child, newLevels, newHeadings, newPath, hierarchyTitle)
    );
  }

  return [{
    path: newPath.filter(Boolean).join(' > '),
    levels: newLevels,
    headings: newHeadings,
    type: currentLevel,
    count: currentNodeCount,
    max_score: node.max_score ?? 0,
    title: hierarchyTitle,
  }];
}

// --- Main combined flow ---
async function ecfrSummary(agency_slug: string) {
  // 1. Get title counts
  const titleCounts = await fetchTitleCounts(agency_slug);

  // 2. Get hierarchy paths
  const hierarchy_url = `https://www.ecfr.gov/api/search/v1/counts/hierarchy?agency_slugs%5B%5D=${encodeURIComponent(agency_slug)}`;
  const res = await fetch(hierarchy_url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();

  // 3. Flatten all hierarchy paths, rooting each path with its top-level title
  const hierarchy: HierarchyNode[] = [];
  for (const node of data.children) {
    hierarchy.push(...walkHierarchy(node));
  }

  // 4. Summary: for each title, show counts and breakdown paths under the title
  const summary = titleCounts.map(tc => ({
    title: tc.title,
    modification_count: tc.modification_count,
    paths: hierarchy.filter(h => h.title === tc.title).map(h => ({
      path: h.path,
      headings: h.headings,
      type: h.type,
      count: h.count,
      max_score: h.max_score,
    }))
  }));

  // 5. Write outputs
  const fileName = `${agency_slug}_comb_summary.json`;
  await fs.writeFile(fileName, JSON.stringify(summary, null, 2));
  console.log(`Wrote combined summary to ${fileName} for agency '${agency_slug}'`);

  // 6. Print human-readable summary
  for (const t of summary) {
    console.log(`\nTitle ${t.title}: ${t.modification_count} modifications`);
    if (t.paths.length === 0) continue;
    const topParts = t.paths
      .filter(p => p.type === 'part')
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    console.log(`  Top 5 modified parts in Title ${t.title}:`);
    for (const part of topParts) {
      console.log(`    - ${part.path}: ${part.count} modifications`);
    }
  }
}

// CLI param for agency_slug
const agency_slug = process.argv[2] || "advisory-council-on-historic-preservation";
ecfrSummary(agency_slug).catch(err => {
  console.error('Error generating ECFR summary:', err);
});

