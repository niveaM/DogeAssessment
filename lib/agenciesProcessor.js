const fetch = require("node-fetch");
const AgencyModel = require("./models/datamodel");
const path = require("path");
// Prefer the TypeScript helpers under scripts/db when running with ts-node
const agencyDb = require("../scripts/db/agencyDatabaseHelper");
const titleDetailsDb = require("../scripts/db/titleDetailsDatabaseHelper");
const { title } = require("process");

// Initialize and attach routes/middleware to an express app
async function init(app, db, options = {}) {
  const publicPath = options.publicPath || path.join(__dirname, "..", "public");
  const searchProcessor = options.searchProcessor;

  // Note: persistence is handled by lib/agencyDatabaseHelper

  // middleware and static
  app.use(require("express").json());
  app.use(require("express").static(publicPath));

  // GET /api/agencies
  app.get("/api/agencies", async (req, res) => {
    try {
      const agencies = (await agencyDb.getAgencies()) || [];
      const parentAgencies = agencies.filter((a) => !a.isChild);
      const titles = (await titleDetailsDb.getTitleDetails()) || [];

      return res.json({ agencies: parentAgencies, titles });
    } catch (err) {
      console.error("/api/agencies error", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/details (renamed from /api/status)
  app.get("/api/details", async (req, res) => {
    try {
      // `db` is the lowdb instance passed into init from server.js; use it
      // to read a lastUpdated value if present. Fall back to null.
      const lastUpdated =
        db && typeof db.get === "function"
          ? db.get("lastUpdated").value()
          : null;
      const agencies = (await agencyDb.getAgencies()) || [];
      const count = Array.isArray(agencies) ? agencies.length : 0;
      res.json({ lastUpdated, count });
    } catch (err) {
      console.error("/api/details error", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Proxy search endpoint to avoid CORS problems and to centralize upstream calls.
  app.get("/api/search", async (req, res) => {
    try {
      const slug = req.query.slug;
      if (!slug)
        return res.status(400).json({ error: "missing slug query param" });
      const page = req.query.page || 1;
      const forceRefresh =
        req.query.refresh === "1" || req.query.refresh === "true";

      try {
        if (!searchProcessor || !searchProcessor.handleSearch) {
          throw new Error(
            "searchProcessor not provided or missing handleSearch method"
          );
        }
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

  // SPA fallback: serve index.html for any non-API GET so client-side routes work
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

module.exports = {
  init,
};
