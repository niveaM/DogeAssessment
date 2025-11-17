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