import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'server', 'data', 'sefs.db');

const db = new Database(DB_PATH);
const docs = db.prepare('SELECT id, name, createdAt FROM documents ORDER BY createdAt DESC').all();
console.log(JSON.stringify(docs, null, 2));
