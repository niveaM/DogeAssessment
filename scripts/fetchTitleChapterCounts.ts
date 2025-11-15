// fetchTitleChapterCounts.ts

import fetch from 'node-fetch';
import { extractHierarchy } from './agencyUtils';

type HierarchyNode = {
  level: string;
  hierarchy: string | null;
  hierarchy_heading: string | null;
  heading: string | null;
  structure_index: number;
  count: number;
  max_score: number | null;
  children?: HierarchyNode[];
};

type HierarchyResponse = {
  count: { value: number; relation: string };
  max_score: number | null;
  children: HierarchyNode[];
  shown_count: number;
};

interface TitleChapterCountsResult {
  title: string | null;
  chapter: string;
  titleCount: number;
  chapterCount: number;
  titleDisplayHeading: string;
  chapterDisplayHeading: string;
  // Raw hierarchy payload. Can be the API response or a processed
  // hierarchy array returned by `extractHierarchy`. Use `any` here to
  // avoid cross-module type mismatches between different HierarchyNode
  // definitions.
  raw: any;
}

function combineHeading(a: string | null, b: string | null): string {
  if (a && b && a !== b) return `${a} | ${b}`;
  return a || b || '';
}

export async function fetchTitleAndChapterCounts(
  agencySlug: string,
  targetTitle: string | null,
  targetChapter: string
): Promise<TitleChapterCountsResult> {
  const url = `https://www.ecfr.gov/api/search/v1/counts/hierarchy?agency_slugs[]=${encodeURIComponent(agencySlug)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

  const data: HierarchyResponse = await res.json();

  let titleCount = 0;
  let chapterCount = 0;
  let titleDisplayHeading = '';
  let chapterDisplayHeading = '';

  if (Array.isArray(data.children)) {
    // Find the (first, if multiple) matching title node
    const titleNode = data.children.find(n => n.level === 'title' && (targetTitle == null || n.hierarchy === targetTitle));
    if (titleNode) {
      titleCount = titleNode.count;
      titleDisplayHeading = combineHeading(titleNode.hierarchy_heading, titleNode.heading);

      // DFS for the matching chapter node within this title node only
      let foundChapterNode: HierarchyNode | null = null;
      const stack = Array.isArray(titleNode.children) ? [...titleNode.children] : [];
      while (stack.length && !foundChapterNode) {
        const node = stack.pop();
        if (!node) continue;
        if (node.level === 'chapter' && node.hierarchy === targetChapter) {
          chapterCount = node.count;
          foundChapterNode = node;
          chapterDisplayHeading = combineHeading(node.hierarchy_heading, node.heading);
          break;
        }
        if (Array.isArray(node.children)) {
          stack.push(...node.children);
        }
      }
    }
  }

  return {
    title: targetTitle,
    chapter: targetChapter,
    titleCount,
    chapterCount,
    titleDisplayHeading,
    chapterDisplayHeading,
    raw: await extractHierarchy(agencySlug),
  };
}

// CLI usage: outputs a simple JSON object with counts and headings
if (require.main === module) {
  const agencySlug = process.argv[2] || 'advisory-council-on-historic-preservation';
  // Pass "" or nothing for all titles
  const title = process.argv[3];
  const chapter = process.argv[4];

  fetchTitleAndChapterCounts(
    agencySlug,
    title && title.length > 0 ? title : null,
    chapter || ''
  ).then((result) => {
    console.log(JSON.stringify({
      title: result.title,
      chapter: result.chapter,
      titleCount: result.titleCount,
      chapterCount: result.chapterCount,
      titleDisplayHeading: result.titleDisplayHeading,
      chapterDisplayHeading: result.chapterDisplayHeading
    }, null, 2));
  }).catch(console.error);
}
