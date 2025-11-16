const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");
const TITLES_KEY = "titles";

function readDb() {
  const adapter = new FileSync(DB_PATH);
  const db = low(adapter);
  db.defaults({ agencies: [], titles: [], titleDetails: [] }).write();
  return db;
}

async function getTitles() {
  const db = readDb();
  return db.get(TITLES_KEY).value() || [];
}

async function persistTitles(titles) {
  const db = readDb();
  db.set(TITLES_KEY, titles).write();
}

async function addOrUpdateTitle(title) {
  if (!title || title.number == null) throw new Error("title must have a number");
  const db = readDb();
  db.get(TITLES_KEY).push(title).write();
}

async function clearTitles() {
  const db = readDb();
  db.set(TITLES_KEY, []).write();
}

function getDbPath() {
  return DB_PATH;
}

module.exports = {
  getTitles,
  persistTitles,
  addOrUpdateTitle,
  clearTitles,
  getDbPath,
};
