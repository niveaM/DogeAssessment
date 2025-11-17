// fetchTitleChapterCounts.ts

import fetch from 'node-fetch';
import { walkHierarchy, combineHeading } from './commonUtils';
import { ECFR_HIERARCHY_COUNTS_BASE } from './config';
import type { HierarchyNode } from './model/hierarchyTypes';

type HierarchyResponse = {
  count: { value: number; relation: string };
  max_score: number | null;
  // Raw API children payload (unprocessed). We treat these as any so
  // callers can access ECFR-specific fields like `level`, `hierarchy`,
  // `heading`, and `children` before normalization.
  children: any[];
  shown_count: number;
};

export interface TitleChapterCountsResult {
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

export async function fetchTitleAndChapterCounts(
  agencySlug: string,
  targetTitle: string | null,
  targetChapter: string
): Promise<TitleChapterCountsResult> {
  const url = `${ECFR_HIERARCHY_COUNTS_BASE}${encodeURIComponent(agencySlug)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

  const data: HierarchyResponse = await res.json();

  let children = [];
  if (Array.isArray(data.children)) {
    children = data.children.filter((child) => {
      if (targetTitle) {
        return (
          child.level === 'title'
          && child.hierarchy === targetTitle);
      }
      return false;
    });
  }

  console.log(`Fetched hierarchy (children) for agency ${agencySlug}: ${data.children.length}`);
  console.log(
    `Filtered hierarchy (children) for agency ${agencySlug}: ${children.length}`
  );

  const hierarchyOutput: HierarchyNode[] = Array.isArray(data.children)
    ? children.flatMap((node: any) => walkHierarchy(node))
    : [];

  let titleCount = 0;
  let chapterCount = 0;
  let titleDisplayHeading = '';
  let chapterDisplayHeading = '';

  if (Array.isArray(children)) {
    // Find the (first, if multiple) matching title node
    const titleNode = children.find(n => n.level === 'title' && (targetTitle == null || n.hierarchy === targetTitle));
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
    raw: hierarchyOutput,
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
