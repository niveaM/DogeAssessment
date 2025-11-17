import * as path from 'path';

// Absolute path to repository-level data directory (../data relative to scripts/)
export const DATA_DIR = path.resolve(__dirname, '..', 'data');

// How many top-level agencies to process when truncation is enabled.
export const AGENCIES_TRUNCATE_LIMIT = 3;

// Base URL for ECFR search counts endpoint. Callers should append the
// encoded agency slug to this string.
export const ECFR_SEARCH_COUNTS_BASE =
	// ECFR expects array-style param `agency_slugs[]=` which must be URL-encoded
	// as `agency_slugs%5B%5D=` when constructing a query string programmatically.
	'https://www.ecfr.gov/api/search/v1/counts/titles?agency_slugs%5B%5D=';

// Base URL for ECFR hierarchy counts endpoint. Callers should append the
// encoded agency slug to this string.
export const ECFR_HIERARCHY_COUNTS_BASE =
	// Use the array-style param form expected by the ECFR API.
	'https://www.ecfr.gov/api/search/v1/counts/hierarchy?agency_slugs%5B%5D=';

export const ECFR_AGENCIES_API_URL = "https://www.ecfr.gov/api/admin/v1/agencies.json";

// Base URL for the eCFR versioner API which serves full-title XML snapshots
// Callers should append the date segment (e.g. '2025-09-30/') and the
// `title-<n>.xml?chapter=<id>&part=<part>` suffix.
export const ECFR_VERSIONER_BASE = 'https://www.ecfr.gov/api/versioner/v1/full/';

export default DATA_DIR;
