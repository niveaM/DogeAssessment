// extractHierarchy.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';

export interface HierarchyNode {
  path: string;
  levels: string[];
  headings: string[];
  type: string;
  count: number;
  max_score: number;
}

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

async function extractHierarchy(agency_slug: string) {
  const api_url = `https://www.ecfr.gov/api/search/v1/counts/hierarchy?agency_slugs%5B%5D=${encodeURIComponent(agency_slug)}`;
  const res = await fetch(api_url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.children)) {
    console.error('No hierarchy children found in response.');
    return;
  }

  const output: HierarchyNode[] = data.children.flatMap((node: any) =>
    walkHierarchy(node)
  );

  // Write to file named after agency_slug for clarity
  const fileName = `../data/${agency_slug}_hierarchy_paths.json`;
  await fs.writeFile(fileName, JSON.stringify(output, null, 2));
  console.log(`Extracted ${output.length} hierarchy paths (see ${fileName}).`);
}

// Get agency_slug from CLI args, default to "advisory-council-on-historic-preservation"
const agency_slug = process.argv[2] || "advisory-council-on-historic-preservation";
extractHierarchy(agency_slug).catch(err => {
  console.error('Error extracting hierarchy:', err);
});

