# scripts/

This directory contains helper scripts (mostly TypeScript) used to fetch and process ECFR data and to produce summary JSON files stored in the repository `data/` folder.

Most scripts write their outputs to the repository-level `data/` directory (the scripts use `../data` via `scripts/config.ts`).

## Prerequisites

- Node.js >= 14 (project `package.json` specifies `node: >=14`).
- npm (or yarn) to install dependencies.

The repository includes runtime dependencies (see root `package.json`). The scripts are written in TypeScript; to run them directly you'll want `typescript` and `ts-node` installed as dev dependencies:

```bash
npm install         # installs runtime dependencies (express, lowdb, node-fetch)
npm install -D typescript ts-node @types/node
```

Alternatively you can run TypeScript compilation with `tsc` and then run the generated JS with `node`.

## Running the scripts

Run individual scripts with `ts-node` (using `npx` if you don't want to install globally):

```bash
npx ts-node scripts/fetchAgencies.ts
npx ts-node scripts/fetchTitles.ts
npx ts-node scripts/fetchEcfrResults.ts
npx ts-node scripts/fetchEcfrResultsUber.ts
npx ts-node scripts/fetchAgencyCount.ts
npx ts-node scripts/fetchTitleCounts.ts
npx ts-node scripts/extractHierarchy.ts
npx ts-node scripts/uberTitleSummary.ts
npx ts-node scripts/ecfrSummary.ts
```

Notes:
- Each script will write output files into the `data/` directory (see `scripts/config.ts`).
- Scripts fetch data from the ECFR API or other sources; run them only when you want to (they perform network requests).

## Files overview

- `config.ts` — exports `DATA_DIR` (absolute path to `../data`) used by scripts for outputs.
- `fetchAgencies.ts` — fetches `/api/admin/v1/agencies.json` and writes `data/agencies.json`.
- `fetchTitles.ts` — fetches titles data and writes results to `data/` (used by other scripts).
- `fetchEcfrResults.ts` — fetches ECFR results for titles (writes to `data/`).
- `fetchEcfrResultsUber.ts` — variant of ECFR results fetching, used to produce "uber" summaries.
- `fetchAgencyCount.ts` — counts agency occurrences in ECFR results and writes summary data.
- `fetchTitleCounts.ts` — produces title-level counts (used for summaries).
- `extractHierarchy.ts` — extracts hierarchical structures from raw ECFR responses.
- `ecfrSummary.ts` — produces consolidated ECFR summary JSON.
- `uberTitleSummary.ts` — produces an aggregated/uber summary for titles.
- `titleUtils.ts` — helper utilities for title parsing and processing.
- `model/` — TypeScript types used by the scripts (e.g. `agencyTypes`, `ecfrTypes`, etc.).
- `title-36.xml` — a source XML file included for title-specific processing.

Generated / committed output files (examples) in this folder:
- `advisory-council-on-historic-preservation_comb_summary.json` — combined summary output for a specific agency.
- `titles.summary.json` — precomputed titles summary.

## Tips & troubleshooting

- If you see TypeScript errors when running with `ts-node`, try compiling first with `npx tsc` to diagnose issues.
- If imports of `node-fetch` fail, make sure `node-fetch` is installed (runtime dependency) and `@types/node-fetch` is installed for TypeScript type hints.
- The scripts are small utilities used for data extraction/aggregation — run them locally when you need to refresh the JSON files in `data/`.

## Example workflow

1. Install deps: `npm install && npm install -D typescript ts-node @types/node`
2. Fetch agencies: `npx ts-node scripts/fetchAgencies.ts`
3. Fetch titles/results: `npx ts-node scripts/fetchTitles.ts && npx ts-node scripts/fetchEcfrResults.ts`
4. Run summaries: `npx ts-node scripts/ecfrSummary.ts` (or the specific summary scripts you need)

If you'd like, I can also add an npm script in the root `package.json` to run some common combos (for example `npm run fetch:all`), or add a small shell script to orchestrate these runs.

---

Generated on 2025-11-14.
