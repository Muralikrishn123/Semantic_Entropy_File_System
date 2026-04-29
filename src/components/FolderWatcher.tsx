import { Eye, EyeOff } from 'lucide-react';

interface Props {
  isActive: boolean;
  onToggle: () => void;
  log: string[];
  pending: number;
  compact?: boolean;
}

export function FolderWatcher({ isActive, onToggle, log, pending, compact = false }: Props) {
  // Mock logic removed, state managed in App.tsx


  if (compact) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 glass rounded-xl">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/10'}`} />
        <span className="text-white/30 text-[11px] font-medium flex-1">Auto-detect</span>
        {pending > 0 && <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-300 text-[9px] rounded-full font-bold">{pending}</span>}
        <button onClick={onToggle} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${isActive ? 'bg-red-500/15 text-red-300 border border-red-500/20' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
          }`}>
          {isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {isActive ? 'Stop' : 'Start'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.015] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/10'}`} />
          <span className="text-white/50 text-xs font-semibold">Folder Watcher</span>
          {pending > 0 && <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 text-[10px] rounded-full font-bold">{pending}</span>}
        </div>
        <button onClick={onToggle} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${isActive
          ? 'bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/25'
          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25'
          }`}>
          {isActive ? <><EyeOff className="w-3 h-3" /> Stop</> : <><Eye className="w-3 h-3" /> Start</>}
        </button>
      </div>
      {log.length > 0 ? (
        <div className="px-4 py-2.5 max-h-24 overflow-y-auto font-mono">
          {log.slice(-5).map((entry, i) => (
            <div key={i} className="text-[10px] text-white/20 py-0.5 leading-relaxed">{entry}</div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-3.5 text-center">
          <p className="text-white/15 text-[11px]">Start watching to auto-detect files</p>
        </div>
      )}
    </div>
  );
}
