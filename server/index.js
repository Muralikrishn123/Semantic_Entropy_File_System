/**
 * SEFS Backend Server
 * ====================
 * Semantic Entropy File System - Node.js/Express Backend
 * 
 * Features:
 * - REST API for file upload, listing, deletion, and analysis
 * - WebSocket for real-time updates when new files are detected
 * - Chokidar folder watcher for auto-detection of new files
 * - PDF text extraction using pdf-parse
 * - TF-IDF semantic analysis engine
 * - Cosine similarity computation
 * - MDS-based 2D projection
 * - DBSCAN clustering
 * - SQLite Persistence (better-sqlite3)
 * 
 * Endpoints:
 *   GET    /api/health           - Health check
 *   GET    /api/documents        - List all documents with spatial data
 *   POST   /api/documents/upload - Upload files (multipart/form-data)
 *   POST   /api/documents/text   - Add document from raw text
 *   DELETE /api/documents/:id    - Remove a document
 *   GET    /api/documents/:id    - Get single document details
 *   GET    /api/layout           - Get current spatial layout
 *   POST   /api/layout/recalculate - Force layout recalculation
 *   GET    /api/clusters         - Get cluster information
 *   GET    /api/search?q=query   - Search documents
 *   POST   /api/watcher/start    - Start folder watcher
 *   POST   /api/watcher/stop     - Stop folder watcher
 *   GET    /api/watcher/status   - Get watcher status
 * 
 * WebSocket Events (ws://localhost:3001):
 *   -> file:detected     - New file detected by watcher
 *   -> file:processed    - File processing complete
 *   -> layout:updated    - Spatial layout recalculated
 *   -> watcher:status    - Watcher status change
 *   -> error             - Error occurred
 * 
 * Usage:
 *   cd server
 *   npm install
 *   npm start
 * 
 * The server will start on port 3001 by default.
 * Set the WATCH_DIR environment variable to specify the folder to watch.
 * Default watch directory: ./watched_files
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { DocumentStore } from './lib/documentStore.js';
import { TextProcessor } from './lib/textProcessor.js';
import { SpatialEngine } from './lib/spatialEngine.js';
import { FolderWatcher } from './lib/folderWatcher.js';
import { extractText } from './lib/fileExtractor.js';

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const WATCH_DIR = process.env.WATCH_DIR || path.join(__dirname, 'watched_files');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
[WATCH_DIR, UPLOAD_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ------------------------------------------------------------------
// Initialize services
// ------------------------------------------------------------------
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const textProcessor = new TextProcessor();
const spatialEngine = new SpatialEngine();
const documentStore = new DocumentStore();
const folderWatcher = new FolderWatcher(WATCH_DIR);

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.pdf', '.md', '.csv', '.json', '.html', '.xml', '.log', '.doc', '.rtf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Allowed: ${allowedTypes.join(', ')}`));
    }
  }
});

// ------------------------------------------------------------------
// Restore State (DB -> TF-IDF -> Layout)
// ------------------------------------------------------------------
function restoreState() {
  console.log('[System] Restoring state from database...');
  const allDocs = documentStore.getAllDocuments();

  if (allDocs.length > 0) {
    // Recompute IDF using all docs
    const allTerms = allDocs.map(d => d.terms);
    const idf = textProcessor.computeIDF(allTerms);

    // Recompute TF-IDF for all
    for (const d of allDocs) {
      d.tfidf = textProcessor.computeTFIDF(d.terms, idf);
    }

    // Identify which docs have missing layout positions
    const layout = spatialEngine.getLayout();
    const missingLayout = allDocs.some(d => !layout[d.id]);

    if (missingLayout) {
      console.log('[System] Recomputing missing layout...');
      spatialEngine.computeLayout(allDocs);
    } else {
      // Just re-init matrix for search purposes if layout is loaded
      // To get matrix for similarity search we do need to re-run buildSimilarityMatrix
      // But computeLayout does that. 
      // If we loaded layout from DB, we still need similarityMatrix for search/clustering.
      // So we PROBABLY should just recompute layout fully on startup to be safe? 
      // Or at least recompute similarity matrix.
      console.log('[System] Revalidating spatial engine state...');
      spatialEngine.computeLayout(allDocs);
    }
  }
  console.log(`[System] Restore complete: ${allDocs.length} documents loaded.`);
}

// RESTORE ON BOOT
restoreState();


// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ------------------------------------------------------------------
// WebSocket Management
// ------------------------------------------------------------------
const wsClients = new Set();

server.on('upgrade', (request, socket, head) => {
  console.log(`[WS] Upgrade request for ${request.url}`);
});

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${ip}`);
  wsClients.add(ws);

  // Send current state on connect
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      documents: documentStore.getAllDocuments(),
      layout: spatialEngine.getLayout(),
      clusters: spatialEngine.getClusters(),
      watcherStatus: folderWatcher.getStatus()
    }
  }));

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('[WS] Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    wsClients.delete(ws);
  });
});

function broadcast(type, data) {
  const message = JSON.stringify({ type, data });
  for (const client of wsClients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  }
}

// ------------------------------------------------------------------
// Core processing pipeline
// ------------------------------------------------------------------
async function processAndAddDocument(name, content, filePath = null, options = { skipUpdate: false }) {
  // 1. Text analysis
  const analysis = textProcessor.analyzeDocument(content);

  // 2. Create document record
  const doc = documentStore.addDocument({
    name,
    content,
    filePath,
    category: analysis.category,
    summary: analysis.summary,
    wordCount: analysis.wordCount,
    topTerms: analysis.topTerms,
    terms: analysis.terms
  });

  if (options.skipUpdate) {
    return doc;
  }

  // 3. Recalculate TF-IDF across all documents
  try {
    const allDocs = documentStore.getAllDocuments();
    const allTerms = allDocs.map(d => d.terms);
    const idf = textProcessor.computeIDF(allTerms);

    for (const d of allDocs) {
      d.tfidf = textProcessor.computeTFIDF(d.terms, idf);
    }

    // 4. Recompute spatial layout
    spatialEngine.computeLayout(allDocs);

    // 5. Broadcast updates
    broadcast('file:processed', {
      document: doc,
      layout: spatialEngine.getLayout(),
      clusters: spatialEngine.getClusters()
    });

    broadcast('layout:updated', {
      layout: spatialEngine.getLayout(),
      clusters: spatialEngine.getClusters()
    });
  } catch (err) {
    console.error('[Process Error] Failed to update layout for doc:', doc.name, err);
    broadcast('file:processed', { document: doc }); // Send at least the doc
    broadcast('error', { message: `Document "${doc.name}" processed, but map update failed.` });
  }

  return doc;
}

function recalculateLayout() {
  try {
    const allDocs = documentStore.getAllDocuments();
    const allTerms = allDocs.map(d => d.terms);
    const idf = textProcessor.computeIDF(allTerms);

    for (const d of allDocs) {
      d.tfidf = textProcessor.computeTFIDF(d.terms, idf);
    }

    spatialEngine.computeLayout(allDocs);

    broadcast('layout:updated', {
      layout: spatialEngine.getLayout(),
      clusters: spatialEngine.getClusters()
    });
  } catch (err) {
    console.error('[Layout Error] Failed to recalculate:', err);
    broadcast('error', { message: 'Failed to update spatial map cluster labels' });
  }
}

// ------------------------------------------------------------------
// Folder Watcher Events
// ------------------------------------------------------------------
folderWatcher.on('status', (status) => {
  console.log(`[Watcher] Status: ${status.active ? 'Active' : 'Inactive'}`);
  broadcast('watcher:status', status);
});

folderWatcher.on('file:detected', async ({ name, filePath }) => {
  console.log(`[Watcher] Detected: ${name}`);
  broadcast('file:detected', { name, filePath });

  try {
    const content = await extractText(filePath);
    if (content && content.length > 20) {
      await processAndAddDocument(name, content, filePath);
      console.log(`[Watcher] Processed: ${name}`);
    } else {
      console.log(`[Watcher] Skipped (insufficient content): ${name}`);
      broadcast('file:skipped', { name, reason: 'Insufficient content' });
    }
  } catch (err) {
    console.error(`[Watcher] Error processing ${name}:`, err.message);
    broadcast('error', { message: `Failed to process ${name}: ${err.message}` });
  }
});

folderWatcher.on('file:removed', ({ name }) => {
  console.log(`[Watcher] File removed: ${name}`);
  const doc = documentStore.findByName(name);
  if (doc) {
    documentStore.removeDocument(doc.id);
    recalculateLayout();
    broadcast('file:removed', { id: doc.id, name });
  }
});

folderWatcher.on('status', (status) => {
  broadcast('watcher:status', status);
});

// ------------------------------------------------------------------
// REST API Routes
// ------------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    documentsCount: documentStore.getCount(),
    watcherActive: folderWatcher.isActive(),
    watchDir: WATCH_DIR
  });
});

// ---- Document CRUD ----

// List all documents with spatial data
app.get('/api/documents', (req, res) => {
  const docs = documentStore.getAllDocuments();
  const layout = spatialEngine.getLayout();
  const clusters = spatialEngine.getClusters();

  const result = docs.map(doc => ({
    id: doc.id,
    name: doc.name,
    category: doc.category,
    summary: doc.summary,
    wordCount: doc.wordCount,
    topTerms: doc.topTerms,
    position: layout[doc.id] || { x: 0.5, y: 0.5 },
    cluster: clusters[doc.id] ?? -1,
    createdAt: doc.createdAt
  }));

  res.json({
    documents: result,
    total: result.length,
    categories: [...new Set(docs.map(d => d.category))],
    clusterCount: new Set(Object.values(clusters)).size
  });
});

// Get single document
app.get('/api/documents/:id', (req, res) => {
  const doc = documentStore.getDocument(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const layout = spatialEngine.getLayout();
  const clusters = spatialEngine.getClusters();

  res.json({
    ...doc,
    position: layout[doc.id] || { x: 0.5, y: 0.5 },
    cluster: clusters[doc.id] ?? -1,
    similarDocuments: spatialEngine.getSimilarDocuments(doc.id, 5)
  });
});

// Upload files
app.post('/api/documents/upload', upload.array('files', 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const results = [];
  const errors = [];

  for (const file of req.files) {
    try {
      const content = await extractText(file.path);
      if (content && content.length > 20) {
        const doc = await processAndAddDocument(file.originalname, content, file.path);
        results.push({
          id: doc.id,
          name: doc.name,
          category: doc.category,
          wordCount: doc.wordCount,
          status: 'processed'
        });
      } else {
        errors.push({
          name: file.originalname,
          error: 'Insufficient text content extracted'
        });
      }
    } catch (err) {
      errors.push({
        name: file.originalname,
        error: err.message
      });
    }
  }

  res.json({
    processed: results,
    errors,
    total: results.length,
    layout: spatialEngine.getLayout(),
    clusters: spatialEngine.getClusters()
  });
});

// Add document from raw text
app.post('/api/documents/text', async (req, res) => {
  const { name, content } = req.body;

  if (!name || !content) {
    return res.status(400).json({ error: 'Both "name" and "content" fields are required' });
  }

  if (content.length < 20) {
    return res.status(400).json({ error: 'Content too short (minimum 20 characters)' });
  }

  try {
    const doc = await processAndAddDocument(name, content);
    const layout = spatialEngine.getLayout();
    const clusters = spatialEngine.getClusters();

    res.json({
      document: {
        id: doc.id,
        name: doc.name,
        category: doc.category,
        summary: doc.summary,
        wordCount: doc.wordCount,
        topTerms: doc.topTerms,
        position: layout[doc.id],
        cluster: clusters[doc.id]
      },
      layout,
      clusters
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch add documents from text
app.post('/api/documents/batch', async (req, res) => {
  try {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: '"documents" array is required' });
    }

    console.log(`[Batch] Received ${documents.length} documents for processing.`);

    const results = [];
    const errors = [];

    for (const { name, content } of documents) {
      try {
        if (!name || !content || content.length < 20) {
          errors.push({ name: name || 'unknown', error: 'Invalid or too short' });
          continue;
        }
        // Use skipUpdate: true to prevent N^2 recalculations
        const doc = await processAndAddDocument(name, content, null, { skipUpdate: true });
        results.push({
          id: doc.id,
          name: doc.name,
          category: doc.category,
          wordCount: doc.wordCount
        });
      } catch (err) {
        console.error(`[Batch Error] Failed to process document "${name}":`, err);
        errors.push({ name, error: err.message });
      }
    }

    // Final single global update after batch
    if (results.length > 0) {
      console.log(`[Batch] Completed ${results.length} docs. Running global layout sync...`);
      try {
        recalculateLayout();
      } catch (layoutErr) {
        console.error('[Batch Error] Layout recalculation failed:', layoutErr);
        // We don't fail the whole request if layout fails, as docs are already in DB
      }
    }

    res.json({
      processed: results,
      errors,
      total: results.length,
      layout: spatialEngine.getLayout(),
      clusters: spatialEngine.getClusters()
    });
  } catch (globalErr) {
    console.error('[Batch Global Error]', globalErr);
    res.status(500).json({ error: globalErr.message });
  }
});

// Delete document
app.delete('/api/documents/:id', (req, res) => {
  const doc = documentStore.getDocument(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  documentStore.removeDocument(req.params.id);

  // Delete the uploaded file if it exists
  if (doc.filePath && fs.existsSync(doc.filePath)) {
    fs.unlinkSync(doc.filePath);
  }

  recalculateLayout();

  res.json({
    message: `Document "${doc.name}" deleted`,
    layout: spatialEngine.getLayout(),
    clusters: spatialEngine.getClusters()
  });
});

// Delete all documents
app.delete('/api/documents', (req, res) => {
  const count = documentStore.getCount();
  documentStore.clear();
  spatialEngine.clear();

  res.json({
    message: `${count} documents deleted`,
    layout: {},
    clusters: {}
  });

  broadcast('layout:updated', { layout: {}, clusters: {} });
});

// ---- Layout ----

// Get current layout
app.get('/api/layout', (req, res) => {
  res.json({
    layout: spatialEngine.getLayout(),
    clusters: spatialEngine.getClusters(),
    similarityMatrix: spatialEngine.getSimilarityMatrix()
  });
});

// Force recalculate layout
app.post('/api/layout/recalculate', (req, res) => {
  recalculateLayout();
  res.json({
    message: 'Layout recalculated',
    layout: spatialEngine.getLayout(),
    clusters: spatialEngine.getClusters()
  });
});

// ---- Clusters ----

// Get cluster info
app.get('/api/clusters', (req, res) => {
  const clusters = spatialEngine.getClusters();
  const docs = documentStore.getAllDocuments();
  const layout = spatialEngine.getLayout();

  // Group docs by cluster
  const clusterGroups = {};
  for (const doc of docs) {
    const clusterId = clusters[doc.id] ?? -1;
    if (!clusterGroups[clusterId]) {
      clusterGroups[clusterId] = {
        id: clusterId,
        documents: [],
        categories: {},
        centroid: { x: 0, y: 0 },
        topTerms: {}
      };
    }
    clusterGroups[clusterId].documents.push({
      id: doc.id,
      name: doc.name,
      category: doc.category
    });
    clusterGroups[clusterId].categories[doc.category] =
      (clusterGroups[clusterId].categories[doc.category] || 0) + 1;

    // Accumulate terms
    for (const [term, score] of Object.entries(doc.tfidf || {})) {
      clusterGroups[clusterId].topTerms[term] =
        (clusterGroups[clusterId].topTerms[term] || 0) + score;
    }
  }

  // Calculate centroids and sort terms
  for (const cluster of Object.values(clusterGroups)) {
    const clusterDocs = cluster.documents;
    let cx = 0, cy = 0;
    for (const d of clusterDocs) {
      const pos = layout[d.id] || { x: 0.5, y: 0.5 };
      cx += pos.x;
      cy += pos.y;
    }
    cluster.centroid = {
      x: cx / clusterDocs.length,
      y: cy / clusterDocs.length
    };
    cluster.topTerms = Object.entries(cluster.topTerms)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term]) => term);
    cluster.dominantCategory = Object.entries(cluster.categories)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';
    cluster.size = clusterDocs.length;
  }

  res.json({
    clusters: Object.values(clusterGroups).filter(c => c.id != -1),
    totalClusters: Object.keys(clusterGroups).filter(id => id != -1).length
  });
});

// ---- Search ----

// Helper for search
function searchDocs(query) {
  const allDocs = documentStore.getAllDocuments();
  const layout = spatialEngine.getLayout();
  const clusters = spatialEngine.getClusters();
  const q = query.toLowerCase().trim();

  return allDocs
    .map(doc => {
      let score = 0;
      const name = doc.name.toLowerCase();
      const content = doc.content.toLowerCase();

      // Exact match in name
      if (name.includes(q)) score += 10;
      // Term match
      for (const term of doc.topTerms) {
        if (q.includes(term.toLowerCase())) score += 5;
      }
      // Content match
      if (content.includes(q)) score += 2;
      // Category match
      if (doc.category.toLowerCase().includes(q)) score += 4;
      // Summary match
      if (doc.summary.toLowerCase().includes(q)) score += 3;

      return {
        ...doc,
        position: layout[doc.id],
        cluster: clusters[doc.id],
        relevanceScore: score
      };
    })
    .filter(r => r.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  const results = searchDocs(query);

  res.json({
    query,
    results: results.map(r => ({
      id: r.id, name: r.name, category: r.category, summary: r.summary,
      wordCount: r.wordCount, topTerms: r.topTerms, position: r.position,
      cluster: r.cluster, relevanceScore: r.relevanceScore
    })),
    total: results.length
  });
});

// ---- AI Assistant / Chat ----

app.post('/api/chat', (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const results = searchDocs(query);
  const allDocs = documentStore.getAllDocuments();

  let response = "";
  const q = query.toLowerCase();

  if (q.includes('how many') || q.includes('count') || q.includes('total')) {
    const cats = new Set(allDocs.map(d => d.category));
    response = `You have **${allDocs.length} documents** in your collection across **${cats.size} categories**.`;
  } else if (q.includes('category') || q.includes('categories')) {
    const counts = {};
    allDocs.forEach(d => counts[d.category] = (counts[d.category] || 0) + 1);
    const list = Object.entries(counts).map(([c, n]) => `• **${c}**: ${n} files`).join('\n');
    response = `Your collection contains these categories:\n\n${list}`;
  } else if (results.length > 0) {
    const top = results[0];
    response = `I found **${results.length}** relevant docs. The best match is **${top.name}** (${top.category}).\n\n**Summary:** ${top.summary}\n\n**Key terms:** ${top.topTerms.join(', ')}`;
  } else {
    response = "I couldn't find any specific documents matching your query. Try asking about 'Technology' or 'Health' documents!";
  }

  res.json({ response });
});

// ---- Similarity ----

app.get('/api/documents/:id/similar', (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  const doc = documentStore.getDocument(id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const similar = spatialEngine.getSimilarDocuments(id, limit);
  res.json({ document: doc.name, similar });
});

// ---- Folder Watcher ----

app.post('/api/watcher/start', (req, res) => {
  const dir = req.body.directory || WATCH_DIR;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  folderWatcher.start(dir);

  res.json({
    message: 'Watcher started',
    directory: dir,
    status: folderWatcher.getStatus()
  });
});

app.post('/api/watcher/stop', (req, res) => {
  folderWatcher.stop();
  res.json({
    message: 'Watcher stopped',
    status: folderWatcher.getStatus()
  });
});

app.get('/api/watcher/status', (req, res) => {
  res.json(folderWatcher.getStatus());
});

// ---- Analytics & Stats ----

app.get('/api/stats', (req, res) => {
  const allDocs = documentStore.getAllDocuments();

  // Aggregate keywords from topTerms
  const allTermsMap = new Map();
  allDocs.forEach(doc => {
    if (doc.topTerms) {
      doc.topTerms.forEach(term => {
        allTermsMap.set(term, (allTermsMap.get(term) || 0) + 1);
      });
    }
  });

  const keywords = [...allTermsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([term, count]) => ({ term, score: count }));

  const totalWords = allDocs.reduce((s, d) => s + d.wordCount, 0);

  res.json({
    totalDocuments: allDocs.length,
    totalWords,
    avgWords: allDocs.length > 0 ? Math.round(totalWords / allDocs.length) : 0,
    keywords,
    categories: Object.entries(allDocs.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    }, {})).map(([name, count]) => ({ name, count }))
  });
});

// ---- Category Colors (for frontend consistency) ----

app.get('/api/categories', (req, res) => {
  const categoryColors = {
    'Technology': '#6366f1',
    'Science': '#3b82f6',
    'Business': '#10b981',
    'Health': '#ef4444',
    'Education': '#f59e0b',
    'Legal': '#8b5cf6',
    'Arts': '#ec4899',
    'Environment': '#14b8a6',
    'General': '#6b7280'
  };

  const docs = documentStore.getAllDocuments();
  const categoryCounts = {};
  for (const doc of docs) {
    categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
  }

  res.json({
    categories: Object.entries(categoryColors).map(([name, color]) => ({
      name,
      color,
      count: categoryCounts[name] || 0
    }))
  });
});

// ---- Error handling ----

app.use((err, req, res, _next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [Error] ${err.message}`);
  if (err.stack) console.error(err.stack);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  // Handle specific body-parser errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Please upload fewer files at once.' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ---- Start server ----

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   SEFS - Semantic Entropy File System Backend    ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Persisted:  SQLite (server/data/sefs.db)       ║`);
  console.log(`║  REST API:   http://localhost:${PORT}/api           ║`);
  console.log(`║  WebSocket:  ws://localhost:${PORT}                 ║`);
  console.log(`║  Watch Dir:  ${WATCH_DIR.substring(0, 36).padEnd(36)}║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET    /api/health');
  console.log('  GET    /api/documents');
  console.log('  POST   /api/documents/upload    (multipart/form-data)');
  console.log('  POST   /api/documents/text      (JSON: {name, content})');
  console.log('  POST   /api/documents/batch     (JSON: {documents: [{name, content}]})');
  console.log('  DELETE /api/documents/:id');
  console.log('  DELETE /api/documents');
  console.log('  GET    /api/documents/:id');
  console.log('  GET    /api/documents/:id/similar');
  console.log('  GET    /api/layout');
  console.log('  POST   /api/layout/recalculate');
  console.log('  GET    /api/clusters');
  console.log('  GET    /api/search?q=query');
  console.log('  POST   /api/watcher/start');
  console.log('  POST   /api/watcher/stop');
  console.log('  GET    /api/watcher/status');
  console.log('  GET    /api/categories');
  console.log('');
  console.log('Drop files into the watched folder to auto-process them!');
  console.log('');

  // AUTO-START WATCHER
  console.log('[System] Starting folder watcher...');
  folderWatcher.start(WATCH_DIR);
});
