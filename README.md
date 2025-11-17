# Nivea-Mandavia-Take-Home-Assessment

## Preface

Thank you for considering my application and giving me the opportunity to showcase my capabilities. I really enjoyed the assignment and was genuinely fascinated by the complexity of U.S. regulations — it was an engaging problem space to explore.

---

## Assumptions

- This project is built to showcase developer skills; data accuracy is not guaranteed. There are known and unknown bugs.
- I am not a UI engineer, so advanced visual polish (transitions, dark mode, etc.) is not present — this is a developer's view of the data she ETLed.
- The developer does not claim to fully understand the data and consumers of it; the UI is primarily become a tool to help the developer make sense of the data.
- The project emphasizes breadth over depth to communicate a "think-big" approach rather than exhaustive domain coverage.

## Approach

- I spent approximately 10 hours on the project; much of that time was spent understanding the data and experimenting with the ECFR APIs.
- GitHub Copilot and Comet were used to assist development.
- TypeScript/Node is not the developer's primary language, but it was chosen to reduce install friction for evaluators.
- The data ingestion pipeline (scripts) writes data in the shape consumed by the webapp.
- The API model favors display-ready endpoints: data is pre-processed and verbose to reduce client-side complexity and avoid repeated server trips.
- LowDB was choosen as JSON is easier to read than using SQLLite. 
- You will notice a struggle to make TypeScript work like Java
- Tests are minimal as integration tests were used to work expediently.
- There are known and unknown bugs; this project is a showcase of approach and engineering, not a production-ready system.

Enjoy!

---

## Code Deep Dive

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