const fetch = require("node-fetch");
const AgencyModel = require("./models/datamodel");

async function refreshData(db) {
  const ECFR_AGENCIES_URL = "https://www.ecfr.gov/api/admin/v1/agencies.json";
  const resp = await fetch(ECFR_AGENCIES_URL);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Fetch failed: ${resp.status} ${resp.statusText} ${text}`);
  }
  const json = await resp.json();

  // Try to locate the array of agencies in the response
  let agencies = [];
  if (Array.isArray(json.agencies)) agencies = json.agencies;
  else if (Array.isArray(json.data)) agencies = json.data;
  else if (Array.isArray(json.results)) agencies = json.results;
  else if (Array.isArray(json)) agencies = json;
  else {
    for (const k of Object.keys(json)) {
      if (Array.isArray(json[k])) {
        agencies = json[k];
        break;
      }
    }
  }

  // Map to internal model
  const mapped = agencies.map((a) => AgencyModel.mapAgency(a));

  db.set("agencies", mapped)
    .set("lastUpdated", new Date().toISOString())
    .write();
  return { count: mapped.length, lastUpdated: db.get("lastUpdated").value() };
}

module.exports = {
  refreshData,
};
