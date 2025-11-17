import * as path from 'path';

// Absolute path to repository-level data directory (../data relative to scripts/)
export const DATA_DIR = path.resolve(__dirname, '..', 'data');

// How many top-level agencies to process when truncation is enabled.
export const AGENCIES_TRUNCATE_LIMIT = 7;

// Base URL for ECFR search counts endpoint. Callers should append the
// encoded agency slug to this string.
export const ECFR_SEARCH_COUNTS_BASE =
	'https://www.ecfr.gov/api/search/v1/counts/titles?agency_slugs=';

// Base URL for ECFR hierarchy counts endpoint. Callers should append the
// encoded agency slug to this string.
export const ECFR_HIERARCHY_COUNTS_BASE =
	'https://www.ecfr.gov/api/search/v1/counts/hierarchy?agency_slugs=';

export default DATA_DIR;
