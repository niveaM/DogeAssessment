// ecfrTypesUber.ts
export interface UberHierarchy {
  title: string;
  subtitle: string;
  chapter: string;
  subchapter: string;
  part: string;
  subpart: string;
  subject_group: string;
  section: string;
  appendix: string;
}

export interface ResultUber {
  starts_on: string;
  ends_on?: string | null;
  type: string;
  uber_hierarchy: UberHierarchy;
  full_text_excerpt?: string | null;
  score: number;
  structure_index: number;
  reserved: boolean;
  removed: boolean;
  change_types: string[];
}

export interface Meta {
  current_page: number;
  total_pages: number;
  total_count: number;
  max_score: number;
  description: string;
}

export interface ECFRResultsUberResponse {
  results: ResultUber[];
  meta: Meta;
}
