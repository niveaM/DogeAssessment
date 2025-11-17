const path = require("path");
const fs = require("fs");
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


    const slug = req.query.slug;
    if (!slug)
      return res.status(400).json({ error: "missing slug query param" });
    const page = req.query.page || 1;
    const forceRefresh =
      req.query.refresh === "1" || req.query.refresh === "true";


    try {
  
      
      const agency = (await agencyDb.getAgencyBySlug(slug)) || null;
      // Safely resolve title lookups in parallel and wait for all to complete.
      // If agency is not found, treat cfr_references as an empty array so we
      // return a graceful response instead of throwing when accessing a
      // property on `null`/`undefined`.
      const refs = agency && Array.isArray(agency.cfr_references) ? agency.cfr_references : [];
      const titles = await Promise.all(
        refs.map((ref) =>
          titleDetailsDb.getTitleByNumberAndSlug(ref.title, slug)
        )
      );
      res.json({ agency, titles });
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

  // GET /api/title/:number - load title JSON from data/title/<number>.*.json
  app.get("/api/title/:number", async (req, res) => {
    try {
      const number = req.params.number;
      const dataDir = path.resolve(__dirname, "..", "data", "title");
      const files = await fs.promises.readdir(dataDir);
      const file = files.find(f => f.startsWith(`${number}.`) && f.endsWith('.json'));
      if (!file) return res.status(404).json({ error: "title file not found" });
      const content = await fs.promises.readFile(path.join(dataDir, file), 'utf8');
      const json = JSON.parse(content);
      return res.json(json);
    } catch (err) {
      console.error("/api/title error", err);
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
