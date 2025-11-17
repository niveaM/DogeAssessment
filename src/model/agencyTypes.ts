// agencyTypes.ts
import { Title } from "./titleTypes";

export interface Agency {
  name: string;
  short_name?: string;
  display_name: string;
  sortable_name: string;
  slug: string;
  children: Agency[];
  cfr_references: CFRReference[];
  // Decoration / display fields (optional) - populated by decorateAgencies.ts
  summary?: string | null;
  // keep original raw if needed for debugging
  _raw?: any;
  isChild?: boolean;
}
export interface CFRReference {
  title: number;
  chapter?: string;
  part?: string;
  subpart?: string;
  subtitle?: string;
  subchapter?: string;
  titleData: Title;
}

export interface AgenciesResponse {
  agencies: Agency[];
}
