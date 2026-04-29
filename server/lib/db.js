/**
 * db.js — SQLite database initialisation for SEFS
 * ================================================
 * Creates / opens server/data/sefs.db and initialises
 * the documents and layout tables if they don't exist.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store the DB file in server/data/
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'sefs.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// -------------------------------------------------------
// Schema
// -------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    content     TEXT NOT NULL,
    filePath    TEXT,
    category    TEXT NOT NULL DEFAULT 'General',
    summary     TEXT NOT NULL DEFAULT '',
    wordCount   INTEGER NOT NULL DEFAULT 0,
    topTerms    TEXT NOT NULL DEFAULT '[]',   -- JSON array
    terms       TEXT NOT NULL DEFAULT '{}',   -- JSON object
    tfidf       TEXT NOT NULL DEFAULT '{}',   -- JSON object
    categoryScores TEXT NOT NULL DEFAULT '{}', -- JSON object
    createdAt   TEXT NOT NULL,
    updatedAt   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS layout (
    docId    TEXT PRIMARY KEY,
    x        REAL NOT NULL DEFAULT 0.5,
    y        REAL NOT NULL DEFAULT 0.5,
    cluster  INTEGER NOT NULL DEFAULT -1
  );
`);

console.log(`[DB] SQLite database ready at: ${DB_PATH}`);

export default db;
