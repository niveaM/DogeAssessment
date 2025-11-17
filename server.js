// Enable requiring TypeScript files at runtime for helper modules (ts-node must be installed)
require("ts-node/register");

const express = require("express");
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

// processors
const agenciesProcessor = require("./lib/agenciesProcessor");

const app = express();
const PORT = process.env.PORT || 3000;

const adapter = new FileSync(path.join(__dirname, "db.json"));
const db = low(adapter);

// Delegate all middleware and route logic to the agenciesProcessor
agenciesProcessor.init(app, db, { publicPath: path.join(__dirname, "public") });

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
