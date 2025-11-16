import * as path from 'path';

// Absolute path to repository-level data directory (../data relative to scripts/)
export const DATA_DIR = path.resolve(__dirname, '..', 'data');

// How many top-level agencies to process when truncation is enabled.
export const AGENCIES_TRUNCATE_LIMIT = 3;

export default DATA_DIR;
