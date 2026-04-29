import { FolderOpen, Sparkles, Trash2, Loader2, BarChart3, MessageSquare, Flame, Download, RefreshCw } from 'lucide-react';
import { BackendStatus } from './BackendStatus';
import type { BackendStatus as BackendStatusData } from '../lib/apiService';

interface Props {
  fileCount: number;
  clusterCount: number;
  backendStatus: BackendStatusData;
  onRetryConnection: () => void;
  onLoadSamples: () => void;
  onClearAll: () => void;
  isProcessing: boolean;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
  showChat: boolean;
  onToggleChat: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onExport: () => void;
  onRefreshLayout: () => void;
}

export function Header({
  fileCount, clusterCount, backendStatus, onRetryConnection,
  onLoadSamples, onClearAll, isProcessing,
  showAnalytics, onToggleAnalytics, showChat, onToggleChat,
  showHeatmap, onToggleHeatmap, onExport, onRefreshLayout
}: Props) {
  return (
    <header className="h-[52px] bg-[#08091a]/95 backdrop-blur-xl border-b border-white/[0.04] flex items-center px-4 gap-3 flex-shrink-0 z-50">
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FolderOpen className="w-4 h-4 text-white" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-[#08091a]" />
        </div>
        <div>
          <h1 className="text-white font-extrabold text-[13px] tracking-tight leading-none flex items-center gap-1.5">
            SEFS
            <span className="text-[8px] font-mono font-medium text-white/12 bg-white/[0.03] px-1.5 py-0.5 rounded">v2.0</span>
          </h1>
          <p className="text-white/15 text-[8px] font-medium tracking-[0.12em] uppercase mt-0.5">Semantic Entropy File System</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 ml-1">
        <BackendStatus status={backendStatus} onRetry={onRetryConnection} />

        {isProcessing ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/8 rounded-lg border border-indigo-500/15">
            <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
            <span className="text-indigo-300 text-[10px] font-semibold">Analyzing...</span>
          </div>
        ) : fileCount > 0 ? (
          <div className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.02] rounded-lg border border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-white/25 text-[10px]"><span className="text-white/60 font-bold">{fileCount}</span> files</span>
            </div>
            <div className="w-px h-3 bg-white/[0.05]" />
            <span className="text-white/25 text-[10px]"><span className="text-white/60 font-bold">{clusterCount}</span> clusters</span>
          </div>
        ) : null}
      </div>

      <div className="flex-1" />

      {/* Feature toolbar */}
      {fileCount > 0 && (
        <div className="flex items-center gap-1 px-1.5 py-1 bg-white/[0.015] rounded-lg border border-white/[0.03]">
          {[
            { icon: BarChart3, label: 'Analytics', active: showAnalytics, onClick: onToggleAnalytics, color: '#818cf8' },
            { icon: MessageSquare, label: 'Chat', active: showChat, onClick: onToggleChat, color: '#a78bfa' },
            { icon: Flame, label: 'Heatmap', active: showHeatmap, onClick: onToggleHeatmap, color: '#f97316' },
            { icon: RefreshCw, label: 'Refresh', active: false, onClick: onRefreshLayout, color: '#60a5fa' },
            { icon: Download, label: 'Export', active: false, onClick: onExport, color: '#34d399' },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} title={btn.label}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold transition-all ${btn.active ? 'text-white border' : 'text-white/20 hover:text-white/40 hover:bg-white/[0.02] border border-transparent'
                }`}
              style={btn.active ? { backgroundColor: btn.color + '12', borderColor: btn.color + '25', color: btn.color } : undefined}
            >
              <btn.icon className="w-3 h-3" />
              <span className="hidden xl:inline">{btn.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button onClick={onLoadSamples} disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 hover:from-indigo-500/20 hover:to-violet-500/20 text-indigo-200 rounded-lg text-[10px] font-semibold border border-indigo-500/15 hover:border-indigo-500/25 transition-all disabled:opacity-20">
          <Sparkles className="w-3 h-3" /> Samples
        </button>
        {fileCount > 0 && (
          <button onClick={onClearAll} disabled={isProcessing}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-white/[0.02] hover:bg-red-500/8 text-white/25 hover:text-red-300 rounded-lg text-[10px] font-semibold border border-white/[0.04] hover:border-red-500/15 transition-all">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </header>
  );
}
