/**
 * Domain types representing normalized ECFR Agency and Search Results shapes.
 *
 * These interfaces are designed to be broad and resilient because upstream
 * ECFR responses vary in field names and nesting. Use the `raw` property to
 * carry the original upstream object when needed.
 */

export interface CfrReference {
  title?: number | string;
  chapter?: string | number | null;
  subtitle?: string | null;
  part?: string | number | null;
  [k: string]: any;
}

export interface Agency {
  // Stable identifiers
  id?: string | number | null;

  // Common presentation fields
  name: string | null;
  displayName?: string | null;
  sortableName?: string | null;
  shortName?: string | null;
  slug?: string | null;

  // Hierarchy
  parent?: string | null;
  children?: Agency[];

  // CFR cross-references (when present in ECFR payloads)
  cfrReferences?: CfrReference[];

  // Other optional metadata
  website?: string | null;
  description?: string | null;

  // Keep the original upstream object for debugging / advanced mapping
  raw?: any;
}

/**
 * Represents a single search result item (document/entry) returned by the ECFR
 * search API. Upstream fields vary, so this interface contains the most common
 * useful fields and preserves the raw payload.
 */
export interface SearchResultItem {
  // ECFR search fields (sample shows many snake_case fields)
  starts_on?: string | null;
  ends_on?: string | null;
  type?: string | null;
  hierarchy?: {
    title?: string | number | null;
    subtitle?: string | null;
    chapter?: string | number | null;
    subchapter?: string | null;
    part?: string | number | null;
    subpart?: string | null;
    subject_group?: string | null;
    section?: string | null;
    appendix?: string | null;
    [k: string]: any;
  } | null;
  hierarchy_headings?: { [k: string]: any } | null;
  headings?: { [k: string]: any } | null;
  full_text_excerpt?: string | null;
  score?: number | null;
  structure_index?: number | null;
  reserved?: boolean;
  removed?: boolean;
  change_types?: string[];

  // Common normalized fields (kept for convenience)
  id?: string | number | null;
  title?: string | null;
  snippet?: string | null; // short excerpt or highlighted fragment
  url?: string | null;
  source?: string | null; // e.g., 'ecfr', 'regulation', etc.
  publishedAt?: string | null; // ISO date if available
  agencySlug?: string | null; // associated agency slug when present

  // Any other metadata returned by upstream
  [k: string]: any;
  raw?: any;
}

/**
 * The normalized shape representing a search response. It captures paging and
 * the array of normalized `SearchResultItem`s. The `raw` property holds the
 * original upstream response when you need to inspect the full payload.
 */
export interface SearchResults {
  // Normalized items (our app-friendly shape)
  items: SearchResultItem[];
  total?: number;
  perPage?: number;
  page?: number;
  pages?: number;
  raw?: any;

  // Upstream ECFR shape
  results?: SearchResultItem[];
  meta?: {
    current_page?: number;
    total_pages?: number;
    total_count?: number;
    max_score?: number;
    description?: string | null;
    [k: string]: any;
  };
}

// Optional helper: a small factory to create a default empty SearchResults
export function emptySearchResults(): SearchResults {
  return { items: [], total: 0, perPage: 0, page: 1, pages: 0 };
}
