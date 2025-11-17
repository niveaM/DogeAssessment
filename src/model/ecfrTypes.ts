// // ecfrTypes.ts
// export interface Hierarchy {
//   title: string;
//   subtitle?: string | null;
//   chapter?: string | null;
//   subchapter?: string | null;
//   part?: string | null;
//   subpart?: string | null;
//   subject_group?: string | null;
//   section?: string | null;
//   appendix?: string | null;
// }

// export interface Headings {
//   title: string;
//   subtitle?: string | null;
//   chapter?: string | null;
//   subchapter?: string | null;
//   part?: string | null;
//   subpart?: string | null;
//   subject_group?: string | null;
//   section?: string | null;
//   appendix?: string | null;
// }

// export interface Result {
//   starts_on: string;
//   ends_on?: string | null;
//   type: string;
//   hierarchy: Hierarchy;
//   hierarchy_headings: Hierarchy;
//   headings: Headings;
//   full_text_excerpt?: string | null;
//   score: number;
//   structure_index: number;
//   reserved: boolean;
//   removed: boolean;
//   change_types: string[];
// }

// export interface Meta {
//   current_page: number;
//   total_pages: number;
//   total_count: number;
//   max_score: number;x
//   description: string;
// }

// export interface ECFRResultsResponse {
//   results: Result[];
//   meta: Meta;
// }
