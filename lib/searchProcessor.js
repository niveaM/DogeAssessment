const fetch = require("node-fetch");

/**
 * @typedef {import('./types/domain').SearchResults} SearchResults
 * @typedef {import('./types/domain').SearchResultItem} SearchResultItem
 */

/**
 * Proxy ECFR search and cache raw response.
 * Returns the upstream JSON shaped as `SearchResults` (no normalization).
 *
 * @param {any} db lowdb instance
 * @param {string} slug agency slug
 * @param {number} [page]
 * @param {boolean} [forceRefresh]
 * @returns {Promise<SearchResults>} upstream ECFR search response
 */
async function handleSearch(db, slug, page = 1, forceRefresh = false) {
  const key = `${slug}:${page}`;
  const cached = db.get(["searchCache", key]).value();
  if (cached && !forceRefresh) {
    // Return the cached raw response
    return cached.raw || cached;
  }

  const upstream = `https://www.ecfr.gov/api/search/v1/results?agency_slugs%5B%5D=${encodeURIComponent(
    slug
  )}&per_page=20&page=${encodeURIComponent(
    page
  )}&order=relevance&paginate_by=results`;
  const resp = await fetch(upstream);
  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error("upstream fetch failed");
    err.status = resp.status;
    err.body = text;
    throw err;
  }
  const json = await resp.json();

  try {
    db.set(["searchCache", key], {
      fetchedAt: new Date().toISOString(),
      slug,
      page,
      raw: json,
    }).write();
  } catch (e) {
    console.error("failed to write search cache", e);
  }

  return json;
}
// Minimal helper that accepts a JSON string or object and returns the raw parsed JSON
// handleSearch returns the upstream JSON (shape compatible with SearchResults)
module.exports = { handleSearch };
