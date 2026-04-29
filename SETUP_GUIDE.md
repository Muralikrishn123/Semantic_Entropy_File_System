# 🔗 SEFS - Complete Setup & Connection Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SEFS Application                          │
│                                                              │
│  ┌──────────────────┐         ┌───────────────────────────┐ │
│  │   FRONTEND        │ ◄─────► │      BACKEND SERVER       │ │
│  │   (React + Vite)  │  REST   │   (Node.js + Express)     │ │
│  │   Port: 5173      │  API    │   Port: 3001              │ │
│  │                   │         │                           │ │
│  │  ┌─────────────┐ │  WS     │  ┌───────────────────┐   │ │
│  │  │ Spatial      │ │ ◄─────► │  │ Text Processor    │   │ │
│  │  │ Canvas (2D)  │ │         │  │ (TF-IDF, NLP)     │   │ │
│  │  └─────────────┘ │         │  └───────────────────┘   │ │
│  │                   │         │  ┌───────────────────┐   │ │
│  │  ┌─────────────┐ │         │  │ Spatial Engine     │   │ │
│  │  │ Sidebar     │ │         │  │ (MDS, Clustering)  │   │ │
│  │  │ (File list) │ │         │  └───────────────────┘   │ │
│  │  └─────────────┘ │         │  ┌───────────────────┐   │ │
│  │                   │         │  │ Folder Watcher     │   │ │
│  │  ┌─────────────┐ │         │  │ (Chokidar)         │   │ │
│  │  │ Drop Zone   │ │         │  └───────────────────┘   │ │
│  │  │ (Upload)    │ │         │  ┌───────────────────┐   │ │
│  │  └─────────────┘ │         │  │ File Extractor     │   │ │
│  │                   │         │  │ (PDF, HTML, JSON)  │   │ │
│  └──────────────────┘         │  └───────────────────┘   │ │
│                               └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Two Modes)

### Mode 1: Client-Only (No Backend Required)
The frontend works **completely standalone** with all processing done in the browser.

```bash
# From the project root:
npm install
npm run dev
```
- Open http://localhost:5173
- Load sample documents or drag & drop your files
- Everything works in-browser (TF-IDF, clustering, visualization)

### Mode 2: Full Stack (Frontend + Backend)
For PDF parsing, real folder watching, and WebSocket live updates.

```bash
# Terminal 1 - Start the Backend:
cd server
npm install
npm start

# Terminal 2 - Start the Frontend:
npm install
npm run dev
```
- Backend runs on http://localhost:3001
- Frontend runs on http://localhost:5173
- Frontend auto-detects the backend and shows "Backend Connected" ✅

---

## 📋 Step-by-Step Setup

### Step 1: Install Frontend Dependencies
```bash
# In the project root directory
npm install
```

### Step 2: Install Backend Dependencies
```bash
# Navigate to server directory
cd server
npm install
```

This installs:
- `express` - HTTP server
- `cors` - Cross-origin requests
- `multer` - File upload handling
- `ws` - WebSocket support
- `chokidar` - File system watching
- `pdf-parse` - PDF text extraction
- `uuid` - Unique ID generation

### Step 3: Start the Backend Server
```bash
cd server
npm start
```

You should see:
```
╔══════════════════════════════════════════════════╗
║   SEFS - Semantic Entropy File System Backend    ║
╠══════════════════════════════════════════════════╣
║  REST API:   http://localhost:3001/api           ║
║  WebSocket:  ws://localhost:3001                 ║
║  Watch Dir:  ./watched_files                     ║
╚══════════════════════════════════════════════════╝
```

### Step 4: Start the Frontend Dev Server
```bash
# In a new terminal, from project root
npm run dev
```

### Step 5: Open in Browser
Navigate to http://localhost:5173

You should see:
- The **SEFS** header with a green "Backend Connected" indicator
- The welcome screen with upload zone and folder watcher controls

---

## 🔌 How the Frontend Connects to Backend

### Automatic Connection Detection
The frontend automatically checks if the backend is running:

1. On page load, it sends a `GET` request to `http://localhost:3001/api/health`
2. If successful → Shows **"Backend Connected"** (green indicator)
3. If failed → Shows **"Client-Only Mode"** (gray indicator)
4. Re-checks every 15 seconds automatically

### Connection Status UI
- Click the status badge in the top-right of the header
- Shows connection details, retry button, and setup instructions
- Displays available features based on connection status

### REST API Connection
```
Frontend → http://localhost:3001/api/... → Backend
```

Key endpoints used:
| Frontend Action          | API Call                          |
|--------------------------|-----------------------------------|
| Check connection         | `GET /api/health`                 |
| Upload files             | `POST /api/documents/upload`      |
| Add text document        | `POST /api/documents/text`        |
| List documents           | `GET /api/documents`              |
| Delete document          | `DELETE /api/documents/:id`       |
| Search                   | `GET /api/search?q=...`           |
| Get layout               | `GET /api/layout`                 |
| Start folder watcher     | `POST /api/watcher/start`         |

### WebSocket Connection
```
Frontend ←→ ws://localhost:3001 ←→ Backend
```

Real-time events pushed from server:
| Event             | When                              |
|-------------------|-----------------------------------|
| `file:detected`   | New file found in watched folder  |
| `file:processed`  | File analysis complete            |
| `layout:updated`  | Spatial map recalculated          |
| `watcher:status`  | Watcher started/stopped           |

---

## 📂 Folder Watching Setup

### Default Watch Directory
The backend watches `server/watched_files/` by default.

### To test folder watching:

1. Start the backend: `cd server && npm start`
2. Start the watcher via API:
   ```bash
   curl -X POST http://localhost:3001/api/watcher/start
   ```
3. Drop a file into the watched folder:
   ```bash
   cp my_document.txt server/watched_files/
   ```
4. The backend will:
   - Detect the file automatically
   - Extract text content
   - Run TF-IDF analysis
   - Compute spatial position
   - Broadcast update via WebSocket
5. The frontend map will animate the new file into position

### Custom Watch Directory
```bash
# Via environment variable
WATCH_DIR=/path/to/your/folder npm start

# Via API call
curl -X POST http://localhost:3001/api/watcher/start \
  -H "Content-Type: application/json" \
  -d '{"directory": "/path/to/your/folder"}'
```

### Sample Test Files
Two sample files are included in `server/sample_files/`:
```bash
# Copy them to the watched folder to test
cp server/sample_files/*.txt server/watched_files/
```

---

## 🧪 Testing the API

### Using the Test Script
```bash
cd server
bash test-api.sh
```

### Manual API Testing

```bash
# 1. Health check
curl http://localhost:3001/api/health

# 2. Add a document
curl -X POST http://localhost:3001/api/documents/text \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_doc.txt",
    "content": "Machine learning is transforming how we process and understand data through neural networks and deep learning algorithms."
  }'

# 3. Upload a file
curl -X POST http://localhost:3001/api/documents/upload \
  -F "files=@your_document.pdf"

# 4. List all documents
curl http://localhost:3001/api/documents

# 5. Search
curl "http://localhost:3001/api/search?q=machine+learning"

# 6. Get spatial layout
curl http://localhost:3001/api/layout

# 7. Get clusters
curl http://localhost:3001/api/clusters

# 8. Start watcher
curl -X POST http://localhost:3001/api/watcher/start

# 9. Check watcher status
curl http://localhost:3001/api/watcher/status
```

### WebSocket Testing
```bash
# Install wscat if needed
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3001

# You'll receive real-time events as files are processed
```

---

## 🔧 Configuration

### Environment Variables

| Variable    | Default           | Description                  |
|------------|-------------------|------------------------------|
| `PORT`     | `3001`            | Backend server port          |
| `WATCH_DIR`| `./watched_files` | Directory for auto-detection |

### Change Backend Port
```bash
PORT=4000 npm start
```

If you change the backend port, update the frontend API URLs in `src/lib/apiService.ts`:
```typescript
const API_BASE = 'http://localhost:4000/api';  // Change 3001 to your port
const WS_URL = 'ws://localhost:4000';          // Change 3001 to your port
```

---

## 🏗️ Production Build

### Frontend Build
```bash
# From project root
npm run build
```
This creates `dist/index.html` - a single-file application.

### Serve Frontend + Backend Together
```bash
# Build frontend
npm run build

# The backend can serve the built frontend too:
# (Add this to server/index.js if needed)
# app.use(express.static('../dist'));

# Start backend
cd server
npm start
```

---

## ❓ Troubleshooting

### "Client-Only Mode" showing even though backend is running
- Check that backend is on port 3001: `curl http://localhost:3001/api/health`
- Check for CORS issues in browser console
- Try refreshing the page or clicking "Retry Connection"

### Backend won't start
```bash
cd server
rm -rf node_modules
npm install
npm start
```

### PDF parsing errors
- Ensure `pdf-parse` is installed: `cd server && npm install pdf-parse`
- Some PDFs with images-only won't have extractable text

### Files not detected by watcher
- Check the file extension is supported (.txt, .pdf, .md, .csv, .json, .html)
- Ensure the file is being written completely before the watcher picks it up
- Check watcher status: `curl http://localhost:3001/api/watcher/status`

### Port already in use
```bash
# Find what's using port 3001
lsof -i :3001

# Kill it
kill -9 <PID>

# Or use a different port
PORT=3002 npm start
```

---

## 📁 Project Structure

```
sefs/
├── index.html                  # Entry HTML
├── package.json                # Frontend dependencies
├── vite.config.ts              # Vite build config
├── tsconfig.json               # TypeScript config
├── SETUP_GUIDE.md              # This file
│
├── src/                        # Frontend source
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # React entry point
│   ├── index.css               # Tailwind CSS
│   ├── utils/cn.ts             # Utility functions
│   │
│   ├── lib/                    # Core logic
│   │   ├── textProcessing.ts   # Client-side NLP engine
│   │   ├── spatialLayout.ts    # 2D projection & clustering
│   │   ├── store.ts            # Application state management
│   │   ├── sampleDocuments.ts  # 20 sample documents
│   │   └── apiService.ts       # Backend API client
│   │
│   └── components/             # React components
│       ├── SpatialCanvas.tsx    # Interactive 2D map (HTML5 Canvas)
│       ├── Sidebar.tsx         # File list & details panel
│       ├── Header.tsx          # Top navigation bar
│       ├── DropZone.tsx        # Drag & drop file upload
│       ├── FolderWatcher.tsx   # Folder watcher UI
│       ├── Legend.tsx          # Category color legend
│       └── BackendStatus.tsx   # Backend connection indicator
│
└── server/                     # Backend source
    ├── package.json            # Backend dependencies
    ├── index.js                # Express server entry point
    ├── README.md               # Backend API documentation
    ├── test-api.sh             # API test script
    │
    ├── lib/                    # Backend modules
    │   ├── textProcessor.js    # NLP engine (server-side)
    │   ├── documentStore.js    # In-memory document database
    │   ├── spatialEngine.js    # Layout computation
    │   ├── fileExtractor.js    # Multi-format text extraction
    │   └── folderWatcher.js    # Chokidar file system watcher
    │
    ├── watched_files/          # Default watch directory
    ├── uploads/                # Uploaded files storage
    └── sample_files/           # Sample files for testing
        ├── quantum_computing.txt
        └── sustainable_farming.txt
```
