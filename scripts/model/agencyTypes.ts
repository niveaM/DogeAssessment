// agencyTypes.ts
export interface CFRReference {
  title: number;
  chapter?: string;
  part?: string;
  subpart?: string;
  subtitle?: string;
  subchapter?: string;
}

export interface Agency {
  name: string;
  short_name?: string;
  display_name: string;
  sortable_name: string;
  slug: string;
  children: Agency[];
  cfr_references: CFRReference[];
}

export interface AgenciesResponse {
  agencies: Agency[];
}
