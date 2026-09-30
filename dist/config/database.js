"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.getDB = getDB;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
let dbInstance = null;
async function initDB() {
    if (dbInstance)
        return dbInstance;
    dbInstance = await (0, sqlite_1.open)({
        filename: path_1.default.join(process.cwd(), 'aif-data.db'),
        driver: sqlite3_1.default.Database
    });
    await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS holds (
      transactionId TEXT PRIMARY KEY,
      payload TEXT,
      assessment TEXT,
      status TEXT,
      createdAt INTEGER,
      agentName TEXT
    );
  `);
    console.log('📦 [Database] SQLite persistent storage initialized.');
    return dbInstance;
}
async function getDB() {
    if (!dbInstance)
        return await initDB();
    return dbInstance;
}
