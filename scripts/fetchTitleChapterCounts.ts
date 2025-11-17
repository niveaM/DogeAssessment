// fetchTitleChapterCounts.ts

import fetch from 'node-fetch';
import { walkHierarchy, combineHeading } from '../src/utils/commonUtils';
import { ECFR_HIERARCHY_COUNTS_BASE } from '../src/config';
import type { HierarchyNode, HierarchyResponse, TitleChapterCountsResult } from '../src/model/hierarchyTypes';

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
