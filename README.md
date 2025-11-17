# Nivea-Mandavia-Take-Home-Assessment

This repository contains two primary parts:

- Data ingestion scripts (TypeScript) — fetch and aggregate ECFR data and store it locally. See `scripts/DATA_INGESTION.md` for details about running the ingestion scripts, endpoints used, and example workflows.
- A small local webapp (Express + minimal frontend) — serves the aggregated JSON data from `data/db.json` and exposes a simple UI.

Webapp overview
- `server.js` — Express server that exposes a minimal API and serves the frontend.
- `public/` — static frontend files (`index.html`, `app.js`, `styles.css`) that render the aggregated JSON in a simple table and provide a small, minimal UI.
- `data/db.json` — the Lowdb-backed JSON file that stores the persisted agencies, titles, and summaries. The webapp reads from this file.

Install & run (local webapp)
```bash
# from the project root
npm install
npm start

# then open in your browser:
# http://localhost:3000
```

API endpoints (webapp)
- GET /api/agencies — returns the array of agencies stored in `data/db.json`
- GET /api/details — returns metadata: { lastUpdated, count }

Screenshots

Homepage (http://localhost:3000/):

![Homepage](public/img/Agency%20View.jpg)

Agency detail (http://localhost:3000/agency/african-development-foundation/USADF):

![Agency detail](public/img/Title%20Details%20for%20Agency.jpg)

Note: the screenshot files are stored in `public/img/` and are included here for visual reference when viewing the repository on GitHub or locally.

If you want the ingestion documentation moved or renamed differently (for example `scripts/INGESTION.md`), or want me to add a link in the root README to a specific section of the ingestion doc, say so and I will adjust.