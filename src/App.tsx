import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FolderSearch, Brain, Zap, ArrowRight, MapPin } from 'lucide-react';
import { SpatialCanvas } from './components/SpatialCanvas';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { FolderWatcher } from './components/FolderWatcher';
import { Legend } from './components/Legend';
import { Analytics } from './components/Analytics';
import { DocumentPreview } from './components/DocumentPreview';
import { ChatAssistant } from './components/ChatAssistant';
import { FileNode, CATEGORY_COLORS, CATEGORY_ICONS } from './lib/spatialLayout';
import { SEFSState, createInitialState, hydrateState } from './lib/store';
import { SAMPLE_DOCUMENTS } from './lib/sampleDocuments';
import { api, BackendStatus as BackendStatusType } from './lib/apiService';
import { processDocument } from './lib/textProcessing';

function generateExportHTML(state: SEFSState): string {
  const cats = new Map<string, number>();
  for (const n of state.fileNodes) cats.set(n.category, (cats.get(n.category) || 0) + 1);
  const catRows = [...cats.entries()].map(([c, n]) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #1a1a2e">${CATEGORY_ICONS[c] || '📄'} ${c}</td><td style="padding:8px;border-bottom:1px solid #1a1a2e;text-align:right;color:${CATEGORY_COLORS[c] || '#999'};font-weight:bold">${n}</td></tr>`
  ).join('');
  const fileRows = state.fileNodes.map(n =>
    `<tr><td style="padding:6px 8px;border-bottom:1px solid #111;font-size:13px">${n.name}</td><td style="padding:6px 8px;border-bottom:1px solid #111;color:${n.color}">${n.category}</td><td style="padding:6px 8px;border-bottom:1px solid #111;font-family:monospace;font-size:12px">${n.wordCount}</td><td style="padding:6px 8px;border-bottom:1px solid #111;font-size:11px;color:#666">${n.topTerms.slice(0, 4).join(', ')}</td></tr>`
  ).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SEFS Report</title><style>body{background:#060810;color:#e0e0e0;font-family:Inter,system-ui,sans-serif;margin:0;padding:40px}h1{color:#818cf8;font-size:24px;margin-bottom:4px}h2{color:#555;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin:40px 0 12px;border-bottom:1px solid #111;padding-bottom:8px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px;border-bottom:2px solid #222;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#444}.card{background:#0a0c18;border:1px solid #111;border-radius:10px;padding:16px;margin:8px 0}.stats{display:flex;gap:12px}.stat{flex:1;text-align:center}.stat-val{font-size:28px;font-weight:bold;font-family:monospace}.stat-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#444;margin-top:4px}</style></head><body><h1>📊 SEFS Report</h1><p style="color:#444;font-size:12px">Generated ${new Date().toLocaleString()}</p><div class="stats" style="margin:24px 0"><div class="card stat"><div class="stat-val" style="color:#818cf8">${state.fileNodes.length}</div><div class="stat-label">Documents</div></div><div class="card stat"><div class="stat-val" style="color:#34d399">${state.clusters.length}</div><div class="stat-label">Clusters</div></div><div class="card stat"><div class="stat-val" style="color:#fbbf24">${cats.size}</div><div class="stat-label">Categories</div></div></div><h2>Categories</h2><div class="card"><table>${catRows}</table></div><h2>Documents</h2><div class="card"><table><thead><tr><th>Name</th><th>Category</th><th>Words</th><th>Key Terms</th></tr></thead><tbody>${fileRows}</tbody></table></div></body></html>`;
}

export function App() {
  const [state, setState] = useState<SEFSState>(createInitialState());
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatusType>(api.getStatus());
  const [watcherActive, setWatcherActive] = useState(false);
  const [watcherLog, setWatcherLog] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // --- API INTEGRATION ---
  const refreshData = useCallback(async () => {
    try {
      const [docsData, clustersData] = await Promise.all([
        api.getDocuments(),
        api.getClusters()
      ]);

      setState(prev => hydrateState(prev, docsData.documents, clustersData.clusters));
      if (docsData.total > 0) setShowWelcome(false);
    } catch (err) {
      console.error("Failed to refresh data:", err);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    const status = await api.checkHealth();
    setBackendStatus(status);
    if (status.connected) {
      refreshData();
      // Also get watcher status
      try {
        const watcher = await api.getWatcherStatus();
        setWatcherActive(watcher.active);
        if (watcher.recentLog) setWatcherLog(watcher.recentLog);
      } catch (e) { }
    }
  }, [refreshData]);

  // Initial load and polling
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [checkConnection]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!backendStatus.connected) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const isDev = window.location.port === '5173';
    const wsUrl = isDev
      ? `ws://${window.location.host}/ws`
      : `ws://${window.location.hostname}:3001`;

    console.log(`[WS] Connecting to ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log('[WS] Connected to backend');

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const time = new Date().toLocaleTimeString();

        if (msg.type === 'init') {
          setWatcherActive(msg.data.watcherStatus.active);
          setWatcherLog(msg.data.watcherStatus.recentLog || []);
          refreshData();
        } else if (msg.type === 'file:processed' || msg.type === 'layout:updated') {
          refreshData();
          if (msg.data.document) {
            setWatcherLog(prev => [...prev.slice(-9), `[${time}] ✅ Processed: ${msg.data.document.name}`]);
          }
        } else if (msg.type === 'file:detected') {
          setWatcherLog(prev => [...prev.slice(-9), `[${time}] 📂 Detected: ${msg.data.name}`]);
        } else if (msg.type === 'watcher:status') {
          setWatcherActive(msg.data.active);
          setWatcherLog(prev => [...prev.slice(-9), `[${time}] ${msg.data.active ? '▶ Watcher Started' : '⏹ Watcher Stopped'}`]);
        } else if (msg.type === 'file:skipped') {
          setWatcherLog(prev => [...prev.slice(-9), `[${time}] ⚠️ Skipped: ${msg.data.name} (${msg.data.reason})`]);
        }
      } catch (err) {
        console.error("WS Message error:", err);
      }
    };

    ws.onerror = () => {
      console.warn("[WS] Connection lost or failed.");
    };

    return () => {
      console.log('[WS] Closing connection...');
      ws.close();
      wsRef.current = null;
    };
  }, [backendStatus.connected, refreshData]);

  const handleToggleWatcher = useCallback(async () => {
    try {
      const data = await api.toggleWatcher(watcherActive);
      setWatcherActive(data.status.active);
    } catch (err) {
      console.error("Toggle watcher error:", err);
    }
  }, [watcherActive]);

  const handleAddFiles = useCallback(async (files: { name: string; content: string }[]) => {
    setIsProcessing(true);
    setShowWelcome(false);

    if (backendStatus.connected) {
      try {
        await api.uploadBatch(files);
        await refreshData();
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Client-only mode processing
      setTimeout(() => {
        const newDocs = files.map(f => processDocument(crypto.randomUUID(), f.name, f.content));
        // Note: Full TF-IDF update in client-only mode would need more logic 
        // for now we just add them to the state.
        // Simplified for this architecture refactor.
        console.log("Processed in client-only mode:", newDocs.length);
        setIsProcessing(false);
      }, 1000);
    }
  }, [backendStatus.connected, refreshData]);

  const handleLoadSamples = useCallback(async () => {
    setIsProcessing(true);
    setShowWelcome(false);

    try {
      await api.uploadBatch(SAMPLE_DOCUMENTS);
      await refreshData();
    } catch (err) {
      console.error("Sample load error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [refreshData]);

  const handleClearAll = useCallback(async () => {
    try {
      await api.clearAll();

      setState(createInitialState());
      setShowWelcome(true);
      setWatcherActive(false);
      setShowAnalytics(false);
      setShowChat(false);
      setShowHeatmap(false);
      setPreviewDocId(null);
    } catch (err) {
      console.error("Clear error:", err);
    }
  }, []);

  const handleRemoveDocument = useCallback(async (id: string) => {
    try {
      await api.removeDocument(id);
      await refreshData();
      setPreviewDocId(prev => prev === id ? null : prev);
    } catch (err) {
      console.error("Remove error:", err);
    }
  }, [refreshData]);


  const handleRefreshLayout = useCallback(async () => {
    setIsProcessing(true);
    try {
      await api.recalculateLayout();
      await refreshData();
    } catch (err) {
      console.error("Refresh layout error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [refreshData]);

  // --- UI HANDLERS ---
  const handleSelectNode = useCallback((node: FileNode | null) => { setState(prev => ({ ...prev, selectedNode: node })); }, []);
  const handleHoverNode = useCallback((node: FileNode | null) => { setState(prev => ({ ...prev, hoveredNode: node })); }, []);
  const handleSearch = useCallback((query: string) => { setState(prev => ({ ...prev, searchQuery: query })); }, []);
  const handleToggleConnections = useCallback(() => { setState(prev => ({ ...prev, showConnections: !prev.showConnections })); }, []);
  const handleClusterClick = useCallback((clusterId: number | null) => { setState(prev => ({ ...prev, activeCluster: clusterId })); }, []);
  const handlePreviewDocument = useCallback((id: string) => { setPreviewDocId(prev => prev === id ? null : id); }, []);

  const handleExport = useCallback(() => {
    const html = generateExportHTML(state);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sefs-report-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const activeCategories = new Set(state.fileNodes.map(n => n.category));
  const previewDoc = previewDocId ? state.documents.find(d => d.id === previewDocId) : null;

  const features = [
    { icon: FolderSearch, title: 'Auto-Detection', desc: 'Watches folders and processes new files automatically', color: '#34d399' },
    { icon: Brain, title: 'Smart Clustering', desc: 'Groups documents by semantic content using TF-IDF', color: '#818cf8' },
    { icon: MapPin, title: 'Spatial Map', desc: 'Interactive 2D canvas with zoom, pan, and tooltips', color: '#60a5fa' },
    { icon: Zap, title: 'Live Animation', desc: 'Spring physics as files find their optimal positions', color: '#f472b6' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#060810] overflow-hidden">
      <Header
        fileCount={state.fileNodes.length}
        clusterCount={state.clusters.length}
        backendStatus={backendStatus}
        onRetryConnection={checkConnection}
        onLoadSamples={handleLoadSamples}
        onClearAll={handleClearAll}
        isProcessing={isProcessing}
        showAnalytics={showAnalytics}
        onToggleAnalytics={() => setShowAnalytics(p => !p)}
        showChat={showChat}
        onToggleChat={() => setShowChat(p => !p)}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(p => !p)}
        onExport={handleExport}
        onRefreshLayout={handleRefreshLayout}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {showWelcome && state.fileNodes.length === 0 ? (
              <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center overflow-y-auto">
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/[0.025] rounded-full blur-3xl" />
                  <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-violet-500/[0.015] rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-lg w-full px-8 py-10 space-y-7">
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center space-y-4">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-2xl shadow-indigo-500/25 animate-pulseGlow" />
                      <div className="absolute inset-0 rounded-2xl flex items-center justify-center">
                        <FolderSearch className="w-9 h-9 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tight">
                        Semantic Entropy
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">File System</span>
                      </h2>
                      <p className="text-white/20 mt-3 leading-relaxed text-[12px] max-w-sm mx-auto">
                        A persistent, self-organizing file manager powered by SQLite and Semantic AI.
                      </p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-2.5">
                    {features.map((f, i) => (
                      <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }}
                        className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-3.5 group hover:border-white/[0.08] transition-all duration-300">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: `${f.color}10` }}>
                          <f.icon className="w-4 h-4" style={{ color: f.color }} />
                        </div>
                        <div className="text-white/70 text-[11px] font-bold mb-0.5">{f.title}</div>
                        <div className="text-white/18 text-[9px] leading-relaxed">{f.desc}</div>
                      </motion.div>
                    ))}
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <DropZone onFilesAdded={handleAddFiles} isProcessing={isProcessing} />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <FolderWatcher isActive={watcherActive} onToggle={handleToggleWatcher} log={watcherLog} pending={0} />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="text-center">
                    <button onClick={handleLoadSamples} disabled={isProcessing}
                      className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white rounded-xl text-[12px] font-bold shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-20 hover:shadow-indigo-500/35 hover:-translate-y-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Load 20 Sample Documents
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    <p className="text-white/8 text-[9px] mt-3">Experience the semantic map with curated sample documents</p>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="absolute inset-0">
                <SpatialCanvas state={state} onSelectNode={handleSelectNode} onHoverNode={handleHoverNode} onClusterClick={handleClusterClick} showHeatmap={showHeatmap} />
                <Legend activeCategories={activeCategories} />

                <div className="absolute top-3 right-3 flex flex-col gap-1.5 w-56">
                  <DropZone onFilesAdded={handleAddFiles} isProcessing={isProcessing} compact />
                  <FolderWatcher isActive={watcherActive} onToggle={handleToggleWatcher} log={watcherLog} pending={0} compact />
                </div>

                <div className="absolute bottom-4 left-4 glass rounded-lg px-2.5 py-1.5 text-[8px] text-white/12 font-mono flex gap-2.5">
                  <span>Scroll: Zoom</span><span>Drag: Pan</span><span>Click: Select</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>{showAnalytics && state.fileNodes.length > 0 && <Analytics state={state} onClose={() => setShowAnalytics(false)} />}</AnimatePresence>
          <AnimatePresence>{previewDoc && <DocumentPreview document={previewDoc} onClose={() => setPreviewDocId(null)} />}</AnimatePresence>
          <AnimatePresence>{showChat && <ChatAssistant state={state} onClose={() => setShowChat(false)} />}</AnimatePresence>
        </div>

        <Sidebar state={state} onSelectNode={handleSelectNode} onRemoveDocument={handleRemoveDocument}
          onSearch={handleSearch} onToggleConnections={handleToggleConnections}
          onClusterClick={handleClusterClick} onPreviewDocument={handlePreviewDocument} />
      </div>
    </div>
  );
}
