## Data ingestion (scripts)

This document describes the data ingestion portion of the project — the TypeScript scripts and helpers that fetch, transform, and persist ECFR data into the local JSON database (`data/db.json`).

Overview
- Purpose: fetch data from the eCFR APIs, aggregate relevant fields (titles, chapters, parts, counts, version summaries), and save the results locally so the webapp can consume them without hitting the live APIs every time.
- Output: aggregated data is written to `data/db.json` (Lowdb file). A small snapshot of `data/db.json` is checked into the repository for offline development and testing.

Key points
- The scripts contact ECFR endpoints (search, hierarchy, and versioner APIs) to obtain titles, hierarchy counts, full-title XML snapshots, and version history.
- Scripts are implemented in TypeScript and expose simple CLIs so they can be run with `npx ts-node ...` for testing and manual ingestion.

Prerequisites
- Node.js >= 14
- Install runtime deps: `npm install`
- Install dev deps for running TypeScript scripts directly: `npm install -D typescript ts-node @types/node`

Where data is stored
- `data/db.json` is the canonical local store the scripts write to. The file is Lowdb-backed and contains agencies, titles, and precomputed summaries (checksums, word counts, version summaries).
- A small sample snapshot of `data/db.json` is committed for convenience so developers can run utilities/tests without contacting the live ECFR APIs.

Primary scripts and helpers
- `scripts/fetchAgencies.ts`
  - Fetches `/api/admin/v1/agencies.json` and persists agency objects into `data/db.json`.
  - Usage (CLI):
    ```bash
    npx ts-node scripts/fetchAgencies.ts [AGENCY_SHORT_NAME]
    ```
    If an agency short name is supplied, only that agency is processed; otherwise all agencies are processed.

- `scripts/fetchTitleChapterCounts.ts` (helper)
  - Exposes `fetchTitleAndChapterCounts(agencySlug, title?, chapter?)` which queries ECFR hierarchy/counts endpoints and returns counts, headings, and raw nodes for downstream processing.

- `scripts/titleUtils.ts` / `src/utils/titleUtils.ts`
  - Helper utilities used by the scripts for parsing and working with title objects and version summaries.

- `src/utils/chapterUtils.ts`
  - `extractChapterChecksum(title, chapterId, agencySlug)`
    - Uses the hierarchy/counts data to determine which parts belong to a chapter, downloads full-title XML fragments from the eCFR versioner API per-part, and computes an aggregated checksum and word count for the chapter.
  - `extractChapterVersionSummary(title, chapterId, agencySlug)`
    - Builds an aggregated version summary for the chapter by calling the versioner `versions` endpoint per-part and merging results.
  - CLI example for manual testing:
    ```bash
    npx ts-node src/utils/chapterUtils.ts 5 LXXXIII "special-inspector-general-for-afghanistan-reconstruction"
    ```

ECFR endpoints used
- `/api/admin/v1/agencies.json` — agency list
- `/api/versioner/v1/versions/title-<n>.json` — versions listing for a title (optionally filtered by chapter/part)
- `/api/versioner/v1/full/{dateString}/title-<n>.xml` — full-title XML snapshots (per-date)
- `/api/search/v1/results` and `/api/search/v1/counts/*` — search results and hierarchical counts used to map agencies -> titles -> chapters -> parts

Running the scripts
- Run individual scripts with `ts-node` (via `npx`):
  ```bash
  npx ts-node scripts/fetchAgencies.ts
  npx ts-node scripts/fetchTitleChapterCounts.ts
  npx ts-node src/utils/chapterUtils.ts
  ```

Each script writes output files into the `data/` directory. The scripts perform network requests; run them only when you intend to refresh the data.

Tests & harnesses
- Unit tests (fast, deterministic) are located under `tst/*.unit.ts` and can be run with:
  ```bash
  npm run test:unit
  ```
- Integration harnesses that call the live ECFR APIs live under `tst/*IntgTest.ts`. Run them selectively (they perform network requests):
  ```bash
  npm run test:intg
  # or run a specific harness directly
  npx ts-node tst/fetchTitleChapterCountsIntgTest.ts
  ```

Tips & troubleshooting
- If you see TypeScript errors with `ts-node`, try compiling with `npx tsc` to get clearer diagnostics.
- If imports of `node-fetch` fail, ensure runtime dependency `node-fetch` is installed and `@types/node-fetch` is present for type hints.
- The scripts are utilities for data extraction and aggregation — they are intended for development and testing rather than production ingestion.

Example workflow
1. Install dependencies: `npm install && npm install -D typescript ts-node @types/node`
2. Fetch agencies: `npx ts-node scripts/fetchAgencies.ts`
3. Fetch title/chapter counts for an agency (use the agency slug, and optionally Title and Chapter):
  ```bash
  npx ts-node scripts/fetchTitleChapterCounts.ts [AGENCY_SLUG] [TITLE] [CHAPTER]
  ```
4. Produce chapter summaries or run the chapter extractor for manual testing (example uses Title 5, Chapter LXXXIII):
  ```bash
  npx ts-node src/utils/chapterUtils.ts 5 LXXXIII "special-inspector-general-for-afghanistan-reconstruction"
  ```

---
---
