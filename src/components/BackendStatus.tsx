import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Server, AlertCircle } from 'lucide-react';
import type { BackendStatus as BackendStatusData } from '../lib/apiService';
import { useState } from 'react';

interface Props {
    status: BackendStatusData;
    onRetry: () => void;
}

export function BackendStatus({ status, onRetry }: Props) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-all ${status.connected
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
            >
                {status.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                    {status.connected ? 'Backend Connected' : 'Client-Only Mode'}
                </span>
            </button>

            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-10 right-0 w-64 bg-[#0a0c1a] border border-white/10 rounded-xl p-4 shadow-2xl z-50 text-[11px]"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-white/70 font-bold">
                                <Server className="w-3.5 h-3.5" />
                                Backend Status
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRetry(); }}
                                className="p-1.5 hover:bg-white/5 rounded-md text-white/30 hover:text-white/60 transition-colors"
                                title="Retry connection"
                            >
                                <RefreshCw className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="space-y-2.5 mb-4">
                            <div className="flex justify-between items-center text-white/20">
                                <span>Connection:</span>
                                <span className={status.connected ? 'text-emerald-400 font-mono' : 'text-red-400 font-mono'}>
                                    {status.connected ? 'ACTIVE' : 'OFFLINE'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-white/20">
                                <span>Last Checked:</span>
                                <span className="text-white/40 font-mono italic">
                                    {new Date(status.lastChecked).toLocaleTimeString()}
                                </span>
                            </div>
                            {status.connected && status.data && (
                                <>
                                    <div className="flex justify-between items-center text-white/20">
                                        <span>Docs In DB:</span>
                                        <span className="text-white/60 font-mono">{status.data.documentsCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-white/20">
                                        <span>Watcher:</span>
                                        <span className={status.data.watcherActive ? 'text-emerald-400' : 'text-white/40'}>
                                            {status.data.watcherActive ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </div>
                                </>
                            )}
                            {status.error && (
                                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-[10px] flex gap-2">
                                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    <span>{status.error}</span>
                                </div>
                            )}
                        </div>

                        <p className="text-white/10 text-[9px] leading-relaxed border-t border-white/5 pt-3">
                            {status.connected
                                ? "All features available. Processing happens on the server with persistence."
                                : "Limited mode. Drag & drop works in-memory without persistent storage."}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
