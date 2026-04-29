# SEFS Backend - Semantic Entropy File System

A Node.js/Express backend server that provides semantic analysis, spatial layout computation, and real-time file watching for the SEFS application.

## Architecture

```
server/
├── index.js                 # Main server entry point (Express + WebSocket)
├── package.json             # Dependencies
├── README.md                # This file
├── lib/
│   ├── textProcessor.js     # NLP engine: tokenization, TF-IDF, category detection
│   ├── documentStore.js     # In-memory document database
│   ├── spatialEngine.js     # 2D projection (MDS), DBSCAN clustering, similarity
│   ├── fileExtractor.js     # Multi-format text extraction (PDF, HTML, JSON, CSV, TXT)
│   └── folderWatcher.js     # Chokidar-based file system watcher
├── watched_files/           # Default folder watching directory (auto-created)
└── uploads/                 # Uploaded files storage (auto-created)
```

## Quick Start

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server
npm start

# Or with auto-reload during development
npm run dev
```

The server starts on **port 3001** by default.

## Environment Variables

| Variable   | Default              | Description                    |
|-----------|----------------------|--------------------------------|
| `PORT`    | `3001`               | Server port                    |
| `WATCH_DIR` | `./watched_files`  | Directory to watch for files   |

## REST API Endpoints

### Health Check
```
GET /api/health
```
Returns server status, uptime, document count, and watcher state.

### Documents

```
GET    /api/documents              # List all documents with positions & clusters
GET    /api/documents/:id          # Get single document with similar docs
POST   /api/documents/upload       # Upload files (multipart/form-data, field: "files")
POST   /api/documents/text         # Add document from JSON: { name, content }
POST   /api/documents/batch        # Add multiple docs: { documents: [{name, content}] }
DELETE /api/documents/:id          # Delete a document
DELETE /api/documents              # Delete all documents
GET    /api/documents/:id/similar  # Get similar documents (query: ?limit=5)
```

### Layout & Clusters
```
GET    /api/layout                 # Get current 2D positions & clusters
POST   /api/layout/recalculate     # Force layout recalculation
GET    /api/clusters               # Get detailed cluster information
```

### Search
```
GET    /api/search?q=query         # Search documents by content, name, category
```

### Folder Watcher
```
POST   /api/watcher/start          # Start watching (optional body: { directory })
POST   /api/watcher/stop           # Stop watching
GET    /api/watcher/status         # Get watcher status & log
```

### Categories
```
GET    /api/categories             # Get category colors and counts
```

## WebSocket

Connect to `ws://localhost:3001` for real-time updates.

### Events received from server:

| Event            | Description                              |
|-----------------|------------------------------------------|
| `init`          | Initial state on connection              |
| `file:detected` | New file detected by watcher             |
| `file:processed`| File analysis and layout complete        |
| `file:removed`  | File removed from watched folder         |
| `layout:updated`| Spatial layout recalculated              |
| `watcher:status`| Watcher started/stopped                  |
| `error`         | Error occurred                           |

### Message format:
```json
{
  "type": "file:processed",
  "data": {
    "document": { "id": "...", "name": "...", "category": "..." },
    "layout": { "doc_id": { "x": 0.5, "y": 0.3 } },
    "clusters": { "doc_id": 0 }
  }
}
```

## API Usage Examples

### Upload files via curl:
```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -F "files=@document1.pdf" \
  -F "files=@document2.txt"
```

### Add document from text:
```bash
curl -X POST http://localhost:3001/api/documents/text \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_document.txt",
    "content": "Machine learning is a subset of artificial intelligence that enables computers to learn from data..."
  }'
```

### Batch add documents:
```bash
curl -X POST http://localhost:3001/api/documents/batch \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {"name": "doc1.txt", "content": "Content of first document..."},
      {"name": "doc2.txt", "content": "Content of second document..."}
    ]
  }'
```

### Search:
```bash
curl "http://localhost:3001/api/search?q=machine+learning"
```

### Start folder watcher:
```bash
curl -X POST http://localhost:3001/api/watcher/start \
  -H "Content-Type: application/json" \
  -d '{"directory": "/path/to/watch"}'
```

### WebSocket connection (JavaScript):
```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  
  switch(type) {
    case 'file:processed':
      console.log('New file processed:', data.document.name);
      // Update your 2D map with data.layout
      break;
    case 'layout:updated':
      console.log('Layout recalculated');
      // Animate nodes to new positions in data.layout
      break;
  }
};
```

## Processing Pipeline

1. **File Detection** → Chokidar detects new/changed files in watched directory
2. **Text Extraction** → Content extracted based on file type (PDF, HTML, JSON, TXT, etc.)
3. **Tokenization** → Text cleaned, lowercased, stop words removed
4. **TF-IDF Computation** → Term frequency-inverse document frequency calculated
5. **Category Detection** → Automatic category assignment using keyword matching
6. **Similarity Matrix** → Pairwise cosine similarity between all document TF-IDF vectors
7. **2D Projection** → MDS + force-directed optimization projects docs to 2D coordinates
8. **Clustering** → DBSCAN groups spatially close + semantically similar documents
9. **Broadcast** → Results pushed to all connected WebSocket clients

## Supported File Types

| Extension | Method                              |
|----------|-------------------------------------|
| `.pdf`   | pdf-parse library (with fallback)   |
| `.txt`   | Direct text read                    |
| `.md`    | Direct text read                    |
| `.html`  | Tag stripping                       |
| `.xml`   | Tag stripping                       |
| `.json`  | Recursive string value extraction   |
| `.csv`   | Delimiter replacement               |
| `.log`   | Direct text read                    |
| `.rtf`   | Direct text read                    |
| `.tex`   | Direct text read                    |

## Categories

Documents are automatically classified into:
- 🟣 **Technology** - Software, AI, programming
- 🔵 **Science** - Research, physics, biology
- 🟢 **Business** - Finance, marketing, strategy
- 🔴 **Health** - Medical, wellness, treatment
- 🟡 **Education** - Learning, teaching, academic
- 🟣 **Legal** - Law, regulation, compliance
- 🩷 **Arts** - Music, painting, literature
- 🟦 **Environment** - Climate, sustainability, conservation
- ⚪ **General** - Uncategorized
