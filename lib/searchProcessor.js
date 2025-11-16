// Minimal stub for searchProcessor so the server can start in development/testing.
// This will return a simple empty result when called.
module.exports = {
  handleSearch: async (db, slug, page, forceRefresh) => {
    return { results: [], slug, page, refreshed: !!forceRefresh };
  },
};
