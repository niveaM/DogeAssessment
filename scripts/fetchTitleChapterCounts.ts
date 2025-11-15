// fetchTitleChapterCounts.ts

import fetch from 'node-fetch';

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
  raw: HierarchyResponse;
}

/**
 * Fetches the hierarchy count tree for an agency and finds counts for the provided title & chapter.
 * If targetTitle is null, sums over all titles.
 */
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

  if (Array.isArray(data.children)) {
    for (const titleNode of data.children) {
      const isMatchingTitle = targetTitle == null || titleNode.hierarchy === targetTitle;
      if (titleNode.level === 'title' && isMatchingTitle) {
        titleCount += titleNode.count;
        // DFS for any matching chapter under this title
        const stack = Array.isArray(titleNode.children)
          ? [...titleNode.children]
          : [];
        while (stack.length) {
          const node = stack.pop();
          if (!node) continue;
          if (node.level === 'chapter' && node.hierarchy === targetChapter) {
            chapterCount += node.count;
            // Don't break; want all matching chapters across all matching titles
          }
          if (Array.isArray(node.children)) {
            stack.push(...node.children);
          }
        }
      }
    }
  }

  return { title: targetTitle, chapter: targetChapter, titleCount, chapterCount, raw: data };
}

// CLI usage -- outputs a simple JSON object with counts
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
      chapterCount: result.chapterCount
    }, null, 2));
  }).catch(console.error);
}

