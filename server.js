const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

// processors
const agenciesProcessor = require("./lib/agenciesProcessor");
const searchProcessor = require("./lib/searchProcessor");

const app = express();
const PORT = process.env.PORT || 3000;

const adapter = new FileSync(path.join(__dirname, "db.json"));
const db = low(adapter);

db.defaults({ agencies: [], lastUpdated: null }).write();

// initialize search cache container
db.defaults({ searchCache: {} }).write();

// (Removed REFRESH_LOCK concurrency guard - always perform refresh when needed)

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/agencies", async (req, res) => {
  try {
    const agencies = db.get("agencies").value() || [];

    // If we already have data, return it immediately (don't call ECFR)
    if (Array.isArray(agencies) && agencies.length > 0) {
      return res.json(agencies);
    }

    // No data yet: perform one initial fetch
    await agenciesProcessor.refreshData(db);
    const newAgencies = db.get("agencies").value() || [];
    return res.json(newAgencies);
  } catch (err) {
    console.error("error loading agencies", err);
    return res
      .status(502)
      .json({ error: "Unable to load agencies", detail: err.message });
  }
});

app.post("/api/refresh", async (req, res) => {
    try {
      // Always attempt a refresh when /api/refresh is called
      await agenciesProcessor.refreshData(db);
      const lastUpdated = db.get("lastUpdated").value();
      const agencies = db.get("agencies").value() || [];
      res.json({ ok: true, count: agencies.length, lastUpdated });
    } catch (err) {
    console.error("refresh error", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/status", (req, res) => {
  const lastUpdated = db.get("lastUpdated").value();
  const agencies = db.get("agencies").value() || [];
  const count = Array.isArray(agencies) ? agencies.length : 0;
  res.json({ lastUpdated, count });
});

// Proxy search endpoint to avoid CORS problems and to centralize upstream calls.
// Example: /api/search?slug=advisory-council-on-historic-preservation&page=1
app.get("/api/search", async (req, res) => {
  try {
    const slug = req.query.slug;
    if (!slug)
      return res.status(400).json({ error: "missing slug query param" });
    const page = req.query.page || 1;
    const forceRefresh =
      req.query.refresh === "1" || req.query.refresh === "true";

    try {
      const json = await searchProcessor.handleSearch(
        db,
        slug,
        page,
        forceRefresh
      );
      return res.json(json);
    } catch (err) {
      if (err && err.status) {
        return res
          .status(502)
          .json({
            error: "upstream fetch failed",
            status: err.status,
            body: err.body,
          });
      }
      throw err;
    }
  } catch (err) {
    console.error("search proxy error", err);
    return res.status(500).json({ error: err.message });
  }
});

// SPA fallback: serve index.html for any non-API GET so client-side routes work when visiting
// /agency/<slug>/<short_name> directly in the browser.
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
