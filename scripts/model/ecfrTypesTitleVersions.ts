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
  title: string
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
}

export interface TitleVersionsResponse {
  content_versions: ContentVersion[];
  meta: Meta;
