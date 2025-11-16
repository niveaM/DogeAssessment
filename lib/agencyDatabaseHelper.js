const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");
const AGENCIES_KEY = "agencies";
const LAST_UPDATED_KEY = "lastUpdated";

function readDb() {
  const adapter = new FileSync(DB_PATH);
  const db = low(adapter);
  db.defaults({ agencies: [], titles: [], titleDetails: [], lastUpdated: null }).write();
  return db;
}

async function persistAgencies(agencies) {
  const db = readDb();
  db.set(AGENCIES_KEY, agencies).write();
}

async function clearAgencies() {
  const db = readDb();
  db.set(AGENCIES_KEY, []).write();
}

async function getAgencies() {
  const db = readDb();
  return db.get(AGENCIES_KEY).value() || [];
}

async function getAgencyByShortName(shortName) {
  const db = readDb();
  return db.get(AGENCIES_KEY).find({ short_name: shortName }).value();
}

async function setLastUpdated(value) {
  const db = readDb();
  db.set(LAST_UPDATED_KEY, value).write();
}

async function getLastUpdated() {
  const db = readDb();
  return db.get(LAST_UPDATED_KEY).value();
}

function getDbPath() {
  return DB_PATH;
}

module.exports = {
  persistAgencies,
  clearAgencies,
  getAgencies,
  getAgencyByShortName,
  setLastUpdated,
  getLastUpdated,
  getDbPath,
};
