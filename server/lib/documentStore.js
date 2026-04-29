/**
 * DocumentStore — SQLite-backed Document Database
 * ================================================
 * Persists documents to SQLite via better-sqlite3.
 * JSON fields (topTerms, terms, tfidf) are serialised on write
 * and deserialised on read automatically.
 */

import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

// -------------------------------------------------------
// Prepared statements (compiled once, reused many times)
// -------------------------------------------------------
const stmts = {
  insert: db.prepare(`
    INSERT INTO documents
      (id, name, content, filePath, category, summary, wordCount, topTerms, terms, tfidf, categoryScores, createdAt, updatedAt)
    VALUES
      (@id, @name, @content, @filePath, @category, @summary, @wordCount, @topTerms, @terms, @tfidf, @categoryScores, @createdAt, @updatedAt)
  `),

  selectOne: db.prepare(`SELECT * FROM documents WHERE id = ?`),

  selectAll: db.prepare(`SELECT * FROM documents ORDER BY createdAt ASC`),

  selectByName: db.prepare(`SELECT * FROM documents WHERE name = ? LIMIT 1`),

  update: db.prepare(`
    UPDATE documents SET
      name      = @name,
      content   = @content,
      filePath  = @filePath,
      category  = @category,
      summary   = @summary,
      wordCount = @wordCount,
      topTerms  = @topTerms,
      terms     = @terms,
      tfidf     = @tfidf,
      categoryScores = @categoryScores,
      updatedAt = @updatedAt
    WHERE id = @id
  `),

  delete: db.prepare(`DELETE FROM documents WHERE id = ?`),

  deleteAll: db.prepare(`DELETE FROM documents`),

  count: db.prepare(`SELECT COUNT(*) AS n FROM documents`),
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function serialise(doc) {
  return {
    ...doc,
    topTerms: JSON.stringify(doc.topTerms ?? []),
    terms: JSON.stringify(doc.terms ?? {}),
    tfidf: JSON.stringify(doc.tfidf ?? {}),
    categoryScores: JSON.stringify(doc.categoryScores ?? {}),
  };
}

function deserialise(row) {
  if (!row) return null;
  return {
    ...row,
    topTerms: JSON.parse(row.topTerms ?? '[]'),
    terms: JSON.parse(row.terms ?? '{}'),
    tfidf: JSON.parse(row.tfidf ?? '{}'),
    categoryScores: JSON.parse(row.categoryScores ?? '{}'),
  };
}

// -------------------------------------------------------
// DocumentStore class
// -------------------------------------------------------
export class DocumentStore {
  /**
   * Add a new document to the store
   * @param {Object} docData
   * @returns {Object} The stored document
   */
  addDocument(docData) {
    const now = new Date().toISOString();
    const doc = {
      id: uuidv4(),
      name: docData.name,
      content: docData.content,
      filePath: docData.filePath ?? null,
      category: docData.category ?? 'General',
      summary: docData.summary ?? '',
      wordCount: docData.wordCount ?? 0,
      topTerms: docData.topTerms ?? [],
      terms: docData.terms ?? {},
      tfidf: docData.tfidf ?? {},
      categoryScores: docData.categoryScores ?? {},
      createdAt: now,
      updatedAt: now,
    };

    stmts.insert.run(serialise(doc));
    console.log(`[Store] Added document: "${doc.name}" (${doc.id}) — Category: ${doc.category}`);
    return doc;
  }

  /**
   * Get a document by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getDocument(id) {
    return deserialise(stmts.selectOne.get(id));
  }

  /**
   * Get all documents
   * @returns {Object[]}
   */
  getAllDocuments() {
    return stmts.selectAll.all().map(deserialise);
  }

  /**
   * Find a document by name (exact match)
   * @param {string} name
   * @returns {Object|null}
   */
  findByName(name) {
    return deserialise(stmts.selectByName.get(name));
  }

  /**
   * Find documents by category
   * @param {string} category
   * @returns {Object[]}
   */
  findByCategory(category) {
    return this.getAllDocuments().filter(d => d.category === category);
  }

  /**
   * Search documents by query string
   * @param {string} query
   * @returns {Object[]}
   */
  search(query) {
    const q = query.toLowerCase();
    return this.getAllDocuments().filter(doc =>
      doc.name.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.summary.toLowerCase().includes(q) ||
      doc.topTerms.some(t => t.toLowerCase().includes(q)) ||
      doc.content.toLowerCase().includes(q)
    );
  }

  /**
   * Update a document (partial update)
   * @param {string} id
   * @param {Object} updates
   * @returns {Object|null}
   */
  updateDocument(id, updates) {
    const existing = this.getDocument(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    stmts.update.run(serialise(updated));
    return updated;
  }

  /**
   * Remove a document
   * @param {string} id
   * @returns {boolean}
   */
  removeDocument(id) {
    const doc = this.getDocument(id);
    if (!doc) return false;
    stmts.delete.run(id);
    console.log(`[Store] Removed document: "${doc.name}" (${id})`);
    return true;
  }

  /**
   * Clear all documents
   */
  clear() {
    const n = this.getCount();
    stmts.deleteAll.run();
    console.log(`[Store] Cleared ${n} documents`);
  }

  /**
   * Get document count
   * @returns {number}
   */
  getCount() {
    return stmts.count.get().n;
  }

  /**
   * Get all unique categories
   * @returns {string[]}
   */
  getCategories() {
    return [...new Set(this.getAllDocuments().map(d => d.category))];
  }

  /**
   * Get store statistics
   * @returns {Object}
   */
  getStats() {
    const docs = this.getAllDocuments();
    const categoryCounts = {};
    let totalWords = 0;

    for (const doc of docs) {
      categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
      totalWords += doc.wordCount;
    }

    return {
      totalDocuments: docs.length,
      totalWords,
      averageWordCount: docs.length > 0 ? Math.round(totalWords / docs.length) : 0,
      categories: categoryCounts,
    };
  }
}
