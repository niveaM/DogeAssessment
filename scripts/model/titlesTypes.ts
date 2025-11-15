import { TitleVersionSummary } from "./ecfrTypesTitleVersions";

// titlesTypes.ts
export interface Title {
  number: number;
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

