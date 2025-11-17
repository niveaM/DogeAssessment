import { TitleChapterCountsResult } from './hierarchyTypes';
import { HierarchyNode } from './hierarchyTypes';

// titlesTypes.ts
export interface Title {
  number: number;
  chapter: string | null;
  name: string;
  latest_amended_on: string | null;
  latest_issue_date: string | null;
  up_to_date_as_of: string | null;
  reserved: boolean;

  // Merged/summary fields (optional) — these combine TitleSummary and TitleMerged
  checksum?: string;
  wordCount?: number;
  // dateString returned from summary (may differ from latest_issue_date)
  dateString?: string | null;
  agencySlug?: string;
  // Debug information: group together fields used for troubleshooting and
  // inspection so they don't pollute the top-level Title shape.
  debug?: {
    // original document-level summary (checksum/wordCount/dateString)
    titleDocumentSummary?: {
      titleNumber: number;
      dateString: string | null;
      checksum: string;
      wordCount: number;
    };
    // date string mismatch between the documented latest_issue_date and the
    // date string returned by the summary fetch
    dateStringMismatch?: {
      latest_issue_date: string | null;
      summary_dateString: string | null;
    };
    // any error encountered while processing this title
    error?: string;
    // error encountered when running agency-related searches for this title
    agencySearchError?: string;
    // optional CFRReference-derived info attached during processing
    requestedChapter?: string;
  };
  versionSummary?: TitleVersionSummary;
  // Number of search results (modification count) for this title for the agency
  searchCount?: number;
  // Optional hierarchy paths for this title as returned by agency hierarchy extraction
  hierarchyPaths?: HierarchyNode[];
  // Aggregated counts for this title/chapter as returned by fetchTitleAndChapterCounts
  titleChapterCounts?: TitleChapterCountsResult;
}

export interface TitlesResponse {
  titles: Title[];
  meta: { date: string; import_in_progress: boolean };
}

// Representation of the repository `data/titles.json` file used by scripts.
// This file uses a map keyed by the title number (string) to the Title object.
export interface TitlesFile {
  titles: Record<string, Title>;
  meta?: { date: string; import_in_progress: boolean };
}

export interface ContentVersion {
  date: string;
  amendment_date: string;
  issue_date: string;
  identifier: string;
  name: string;
  part: string;
  substantive: boolean;
  removed: boolean;
  subpart: string | null;
  title: string;
  type: string; // 'section', 'appendix', etc.
}

export interface Meta {
  title: string;
  result_count: number;
  latest_amendment_date: string;
  latest_issue_date: string;
}

export interface TitleVersionSummary {
  titleNumber: number;
  totalVersions: number;
  firstDate: string;
  lastDate: string;
  uniqueParts: number;
  uniqueSubparts: number;
  typeCounts: Record<string, number>;
  // Optional metadata to indicate the chapter or part this summary was derived from
  chapterId?: string;
  // Optional raw per-part summaries when an aggregated summary is produced
  raw?: TitleVersionSummary[];
  // Aggregated list of part identifiers included in this summary
  parts?: string[];
}

export interface TitleVersionsResponse {
  content_versions: ContentVersion[];
  meta: Meta;
}


