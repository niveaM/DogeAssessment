// ecfrCorrectionsTypes.ts

export interface ECFRReference {
  cfr_reference: string;
  hierarchy: {
    title: string;
    subtitle?: string;
    chapter?: string;
    subchapter?: string;
    part?: string;
    subpart?: string;
    subject_group?: string;
    section?: string;
    appendix?: string;
  };
}

export interface ECFRCorrection {
  id: number;
  cfr_references: ECFRReference[];
  corrective_action: string;
  error_corrected: string;
  error_occurred: string;
  fr_citation: string;
  position: number;
  display_in_toc: boolean;
  title: number;
  year: number;
  last_modified: string;
}

export interface ECFRCorrectionsResponse {
  ecfr_corrections: ECFRCorrection[];
}

export interface ECFRCorrectionsSummary {
  title: number;
  totalCorrections: number;
  yearsCovered: number[];
  firstCorrection: string | null;
  lastCorrection: string | null;
  actionsCount: Record<string, number>;
  uniqueSections: number;
}

