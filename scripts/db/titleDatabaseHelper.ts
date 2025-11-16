// titleDatabaseHelper.ts
// import * as path from "path";
// import type { Title } from "./../model/titlesTypes";
// import { getDbPath } from "./databaseHelper";

// export type TitlesMap = Record<string, Title>;

// // Use the same db.json path as agencyDatabaseHelper
// const DB_JSON = getDbPath();
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// import low from "lowdb";
// import FileSync from "lowdb/adapters/FileSync";

// function getLowDb() {
//   const adapter = new FileSync(DB_JSON);
//   const db = low(adapter);
//   db.defaults({ agencies: [], titles: [] }).write();
//   return db;
// }
