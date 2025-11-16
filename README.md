# Nivea-Mandavia-Take-Home-Assessment

This project provides a small, local UI and backend that:

- Fetches agency data from the ECFR endpoint: https://www.ecfr.gov/api/admin/v1/agencies.json
- Stores the data locally using Lowdb (file-backed JSON)
- Serves a simple React UI (served from the same Express server) that displays the JSON in an HTML table and provides a refresh action

## What was added

- `server.js` — Express server with endpoints to read/refresh stored agencies and serve the UI
- `db.json` — lowdb file used to persist the agencies and lastUpdated timestamp
- `package.json` — project manifest (dependencies + start script)
- `public/index.html`, `public/app.js`, `public/styles.css` — React-based frontend (React via CDN + Babel for quick dev)

## Requirements

- Node.js 14+ (recommended)

## Install & run (local)

Open a terminal and run:

```bash
# from the project root
npm install
npm start

# then open in your browser:
# http://localhost:3000
```

## API endpoints

- GET /api/agencies — returns the array of agencies stored in `db.json`
- POST /api/refresh — fetches the ECFR API, updates `db.json`, and returns { ok, count, lastUpdated }
- GET /api/details — returns metadata: { lastUpdated, count }

The UI is served at `/` and calls the above endpoints.

## Notes & next steps

- Frontend uses React from a CDN and Babel in the browser for a lightweight demo setup. For production or larger work, I recommend creating a proper build with Vite/CRA and bundling the frontend.
- Improvements you might add: pagination, column-mapped table view (extract specific fields rather than rendering raw JSON), unit tests, CI, and a small script to schedule `refresh`.

If you want, I can wire a small test or convert the frontend to a proper React build (Vite).
# Nivea-Mandavia-Take-Home-Assessment
Code is built to scrape data, store & analyze it, and display results—all with clean, maintainable code ideal for POC and extension later.

## Frontend /UI:

React (JavaScript): Build the interactive user interface.

HTML Table/JSX: Render JSON data in a simple, readable format.

Fetch API: Pull data from the ECFR government JSON endpoint.

## Backend/Storage (Node.js):

Lowdb: Lightweight, file-based JSON database for persistent, in-memory analysis and storage.

## Why this stack?

Minimal setup: No complex infrastructure required.

Fast prototyping: Instant routing and UI; near-zero config database.

Easy data handling: JSON is natively supported by both stack components.

Persistence: Lowdb stores data in a file so it survives app restarts.