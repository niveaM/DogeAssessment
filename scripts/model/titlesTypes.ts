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
  dateStringMismatch?: {
    latest_issue_date: string | null;
    summary_dateString: string | null;
  };
  agencySlug?: string;
  error?: string;
  // keep the raw summary available for debugging
  summary?: {
    titleNumber: number;
    dateString: string | null;
    checksum: string;
    wordCount: number;
  };
}

export interface TitlesResponse {
  titles: Title[];
  meta: { date: string; import_in_progress: boolean };
}

