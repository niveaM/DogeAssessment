// titlesTypes.ts
export interface Title {
  number: number;
  name: string;
  latest_amended_on: string | null;
  latest_issue_date: string | null;
  up_to_date_as_of: string | null;
  reserved: boolean;
}
export interface TitlesResponse {
  titles: Title[];
  meta: { date: string; import_in_progress: boolean };
}

