/**
 * SpatialEngine - 2D Layout, Clustering & Similarity
 * =====================================================
 * Handles dimensionality reduction (MDS/force-directed),
 * DBSCAN clustering, and similarity computations.
 * 
 * PERSISTENCE:
 * - Layout positions and cluster IDs are stored in the SQLite 'layout' table.
 * - On startup, existing layout is loaded.
 * - On recompute, new layout is saved to DB.
 */

import { TextProcessor } from './textProcessor.js';
import db from './db.js';

const textProcessor = new TextProcessor();

// -------------------------------------------------------
// Prepared statements
// -------------------------------------------------------
const stmts = {
  // Upsert layout position (SQLite specific syntax for upset)
  upsertLayout: db.prepare(`
    INSERT INTO layout (docId, x, y, cluster)
    VALUES (@docId, @x, @y, @cluster)
    ON CONFLICT(docId) DO UPDATE SET
      x = excluded.x,
      y = excluded.y,
      cluster = excluded.cluster
  `),

  loadLayout: db.prepare(`SELECT * FROM layout`),

  clearLayout: db.prepare(`DELETE FROM layout`)
};

export class SpatialEngine {
  constructor() {
    /** @type {Object<string, {x: number, y: number}>} positions by doc ID */
    this.layout = {};

    /** @type {Object<string, number>} cluster labels by doc ID */
    this.clusters = {};

    /** @type {number[][]} last computed similarity matrix */
    this.similarityMatrix = [];

    /** @type {string[]} document IDs in matrix order */
    this.matrixDocIds = [];

    // Load persisted layout on startup
    this._loadPersistedLayout();
  }

  /**
   * Load layout from SQLite
   * @private
   */
  _loadPersistedLayout() {
    const rows = stmts.loadLayout.all();
    for (const row of rows) {
      this.layout[row.docId] = { x: row.x, y: row.y };
      this.clusters[row.docId] = row.cluster;
    }
    console.log(`[Spatial] Loaded ${rows.length} layout positions from DB`);
  }

  /**
   * Compute the full spatial layout for all documents
   * Includes: similarity matrix, 2D projection, clustering
   * 
   * @param {Object[]} documents - Array of documents with tfidf property
   */
  computeLayout(documents) {
    if (documents.length === 0) {
      this.clear();
      return;
    }

    // Store doc IDs for matrix reference
    this.matrixDocIds = documents.map(d => d.id);

    // 1. Build similarity matrix
    this.similarityMatrix = textProcessor.buildSimilarityMatrix(documents);

    // 2. Project to 2D using MDS + force-directed optimization
    const positions = this._projectTo2D(documents, this.similarityMatrix);

    // 3. Cluster using DBSCAN
    const clusterLabels = this._clusterDocuments(documents, positions, this.similarityMatrix);

    // 4. Update memory AND persist to DB
    this.layout = {};
    this.clusters = {};

    // Batch DB transaction for performance
    const transaction = db.transaction(() => {
      // We don't clear the whole table, we upsert, so if a doc was removed 
      // it should ideally be removed from layout too. 
      // For simplicity in this implementation, we upsert active docs.
      // Clean up of stale layout entries happens if we wanted to be strict,
      // but here we just overwrite. 

      // Ideally clear old entries that are not in current document set
      // layout is cheap, so let's clear and rewrite or just upsert?
      // Upsert is safer if we have partial updates, but computeLayout is global.
      // Let's stick to upsert for now.

      for (let i = 0; i < documents.length; i++) {
        const docId = documents[i]?.id;
        if (!docId) {
          console.warn(`[Spatial] Skipping doc at index ${i} - missing ID`);
          continue;
        }

        let pos = positions[i] || { x: 0.5, y: 0.5 };
        let cluster = clusterLabels[i];

        // SANITY CHECK: Never allow NaN, Infinity or non-numbers to hit the DB
        if (!Number.isFinite(pos.x)) pos.x = 0.5;
        if (!Number.isFinite(pos.y)) pos.y = 0.5;
        if (!Number.isFinite(cluster)) cluster = -1;

        this.layout[docId] = pos;
        this.clusters[docId] = cluster;

        stmts.upsertLayout.run({
          docId,
          x: pos.x,
          y: pos.y,
          cluster
        });
      }
    });

    transaction();

    console.log(`[Spatial] Layout computed & persisted: ${documents.length} docs, ${new Set(clusterLabels).size} clusters`);
  }

  /**
   * MDS-like 2D projection using force-directed optimization
   * @private
   */
  _projectTo2D(documents, simMatrix) {
    const n = documents.length;
    if (n === 0) return [];
    if (n === 1) return [{ x: 0.5, y: 0.5 }];

    // Convert similarity to distance
    const targetDist = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Use linear distance (1 - sim) instead of sqrt(2*(1-sim))
        // This packs similar items tighter (sim=0.9 -> dist=0.1) so they fall within eps
        targetDist[i][j] = 1 - Math.max(0, Math.min(1, simMatrix[i][j]));
      }
    }

    // Initialize positions using similarity-weighted circular projection + jitter
    const points = [];
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      for (let j = 0; j < n; j++) {
        const angle = (2 * Math.PI * j) / n;
        x += simMatrix[i][j] * Math.cos(angle);
        y += simMatrix[i][j] * Math.sin(angle);
      }
      // Add small jitter to avoid exact overlaps
      const jitter = 0.01 * (Math.random() - 0.5);
      points.push({ x: x / n + 0.5 + jitter, y: y / n + 0.5 + jitter });
    }

    // Force-directed optimization (Sammon mapping inspired)
    const iterations = 200;
    let learningRate = 0.05;

    for (let iter = 0; iter < iterations; iter++) {
      const decay = 1 - iter / iterations;
      const lr = learningRate * decay;

      for (let i = 0; i < n; i++) {
        let fx = 0, fy = 0;

        for (let j = 0; j < n; j++) {
          if (i === j) continue;

          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const currentDist = Math.sqrt(dx * dx + dy * dy) + 1e-6;
          const target = targetDist[i][j];

          // Clamp force to avoid astronomical values when points overlap
          let force = (currentDist - target) / currentDist;
          if (Math.abs(force) > 10) force = Math.sign(force) * 10;

          fx -= force * dx * lr;
          fy -= force * dy * lr;
        }

        // Clamp movement per iteration
        const maxMove = 0.1;
        fx = Math.max(-maxMove, Math.min(maxMove, fx));
        fy = Math.max(-maxMove, Math.min(maxMove, fy));

        points[i].x += fx;
        points[i].y += fy;
      }
    }

    // Normalize to [0.08, 0.92] range
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 0.08;

    for (const p of points) {
      p.x = padding + ((p.x - minX) / rangeX) * (1 - 2 * padding);
      p.y = padding + ((p.y - minY) / rangeY) * (1 - 2 * padding);
    }

    return points;
  }

  /**
   * DBSCAN-inspired clustering using both spatial proximity and semantic similarity
   * @private
   */
  _clusterDocuments(documents, positions, simMatrix) {
    const n = documents.length;
    if (n === 0) return [];

    const labels = Array(n).fill(-1);
    let currentCluster = 0;

    const eps = 0.65; // Relaxed to capture similarity > ~0.35
    const minPts = 1;

    function regionQuery(pointIdx) {
      const neighbors = [];
      for (let i = 0; i < n; i++) {
        if (i === pointIdx) continue;
        const dx = positions[pointIdx].x - positions[i].x;
        const dy = positions[pointIdx].y - positions[i].y;
        const spatialDist = Math.sqrt(dx * dx + dy * dy);
        const semanticSim = simMatrix[pointIdx][i];

        // Relaxed semantic similarity threshold for better grouping of short texts
        if (spatialDist < eps && semanticSim > 0.05) {
          neighbors.push(i);
        }
      }
      return neighbors;
    }

    for (let i = 0; i < n; i++) {
      if (labels[i] !== -1) continue;

      const neighbors = regionQuery(i);
      if (neighbors.length < minPts) {
        labels[i] = currentCluster++;
        continue;
      }

      labels[i] = currentCluster;
      const queue = [...neighbors];
      const visited = new Set([i]);

      while (queue.length > 0) {
        const j = queue.shift();
        if (visited.has(j)) continue;
        visited.add(j);

        if (labels[j] === -1 || labels[j] === j) {
          labels[j] = currentCluster;
        } else {
          continue;
        }

        const jNeighbors = regionQuery(j);
        if (jNeighbors.length >= minPts) {
          queue.push(...jNeighbors);
        }
      }

      currentCluster++;
    }

    return labels;
  }

  /**
   * Get the current layout positions
   * @returns {Object<string, {x: number, y: number}>}
   */
  getLayout() {
    return { ...this.layout };
  }

  /**
   * Get the current cluster assignments
   * @returns {Object<string, number>}
   */
  getClusters() {
    return { ...this.clusters };
  }

  /**
   * Get the similarity matrix
   * @returns {number[][]}
   */
  getSimilarityMatrix() {
    return this.similarityMatrix;
  }

  /**
   * Get documents most similar to a given document
   * @param {string} docId - Document ID
   * @param {number} limit - Max results
   * @returns {Object[]} Similar documents with similarity scores
   */
  getSimilarDocuments(docId, limit = 5) {
    const idx = this.matrixDocIds.indexOf(docId);
    if (idx === -1) return [];

    const similarities = this.matrixDocIds
      .map((id, i) => ({
        id,
        similarity: this.similarityMatrix[idx]?.[i] || 0
      }))
      .filter(item => item.id !== docId)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }

  /**
   * Clear all layout data
   */
  clear() {
    this.layout = {};
    this.clusters = {};
    this.similarityMatrix = [];
    this.matrixDocIds = [];
    stmts.clearLayout.run(); // Clear DB table too
    console.log('[Spatial] Layout cleared');
  }
}
