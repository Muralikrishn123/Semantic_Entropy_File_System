import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, BarChart3, Hash, TrendingUp, PieChart, Loader2 } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../lib/spatialLayout';
import { SEFSState } from '../lib/store';
import { api } from '../lib/apiService';

interface Props { state: SEFSState; onClose: () => void; }

interface StatsData {
  totalDocuments: number;
  totalWords: number;
  avgWords: number;
  keywords: { term: string; score: number }[];
  categories: { name: string; count: number }[];
}

function polarToCart(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, s: number, e: number) {
  const start = polarToCart(cx, cy, r, e - 0.5);
  const end = polarToCart(cx, cy, r, s);
  const large = e - s > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

export function Analytics({ state, onClose }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then(data => { setStats(data); setLoading(false); })
      .catch(err => { console.error("Stats fetch error:", err); setLoading(false); });
  }, []);

  const categoryData = useMemo(() => {
    if (!stats) return [];
    return stats.categories
      .map(c => ({
        name: c.name,
        count: c.count,
        color: CATEGORY_COLORS[c.name] || '#9ca3af',
        icon: CATEGORY_ICONS[c.name] || '📄',
        pct: (c.count / (stats.totalDocuments || 1)) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats]);

  const topKeywords = stats?.keywords || [];
  const maxKw = topKeywords.length > 0 ? Math.max(...topKeywords.map(k => k.score)) : 1;
  const totalWords = stats?.totalWords || 0;
  const avgWords = stats?.avgWords || 0;

  const pieSlices = useMemo(() => {
    let angle = 0;
    return categoryData.map(c => {
      const a = (c.count / Math.max(1, stats?.totalDocuments || 0)) * 360;
      const slice = { ...c, startAngle: angle, endAngle: angle + a };
      angle += a;
      return slice;
    });
  }, [categoryData, stats?.totalDocuments]);

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute top-0 right-[340px] bottom-0 w-[360px] bg-[#090b18]/97 backdrop-blur-2xl border-l border-white/[0.04] z-40 flex flex-col overflow-hidden">

      <div className="flex items-center justify-between p-4 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h2 className="text-white font-bold text-[13px]">Analytics</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md text-white/20 hover:text-white/50 transition-all"><X className="w-3.5 h-3.5" /></button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <p className="text-white/12 text-[10px]">Processing statistics...</p>
        </div>
      ) : !stats || stats.totalDocuments === 0 ? (
        <div className="flex-1 flex items-center justify-center"><p className="text-white/12 text-[11px]">Add documents to see analytics</p></div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Files', value: state.fileNodes.length, Icon: Hash, color: '#818cf8' },
              { label: 'Clusters', value: state.clusters.length, Icon: PieChart, color: '#34d399' },
              { label: 'Avg Words', value: avgWords, Icon: TrendingUp, color: '#fbbf24' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.03]">
                <s.Icon className="w-3 h-3 mb-1.5" style={{ color: s.color }} />
                <div className="text-base font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-white/10 text-[7px] font-bold uppercase tracking-widest mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Pie Chart */}
          <div>
            <h3 className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-2.5">Category Distribution</h3>
            <div className="flex items-center gap-4">
              <svg width="100" height="100" viewBox="0 0 120 120" className="flex-shrink-0">
                {pieSlices.map((s, i) => (
                  <path key={i} d={arcPath(60, 60, 50, s.startAngle, s.endAngle)} fill={s.color} opacity={0.85} stroke="#090b18" strokeWidth={1.5} />
                ))}
                <circle cx="60" cy="60" r="22" fill="#090b18" />
                <text x="60" y="57" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="JetBrains Mono, monospace">{state.fileNodes.length}</text>
                <text x="60" y="69" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="Inter, sans-serif">files</text>
              </svg>
              <div className="flex-1 space-y-1">
                {categoryData.map(c => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span className="text-[9px]">{c.icon}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-white/35 text-[9px] flex-1 truncate">{c.name}</span>
                    <span className="text-white/20 text-[8px] font-mono">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <h3 className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-2.5">Top Keywords (TF-IDF)</h3>
            <div className="space-y-1">
              {topKeywords.map(kw => (
                <div key={kw.term} className="flex items-center gap-2">
                  <span className="text-white/35 text-[9px] w-18 truncate font-mono">{kw.term}</span>
                  <div className="flex-1 h-1 bg-white/[0.02] rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(kw.score / maxKw) * 100}% ` }} transition={{ duration: 0.5, delay: 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                  </div>
                  <span className="text-white/12 text-[7px] font-mono w-6 text-right">{kw.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clusters */}
          <div>
            <h3 className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-2.5">Clusters</h3>
            <div className="space-y-1.5">
              {state.clusters.map(cl => (
                <div key={cl.id} className="bg-white/[0.015] rounded-lg p-2.5 border border-white/[0.03]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/45 text-[10px] font-semibold truncate flex-1 mr-2">{cl.category}</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cl.color + '18', color: cl.color }}>{cl.fileCount}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cl.topTerms.slice(0, 4).map(t => (
                      <span key={t} className="px-1 py-0.5 bg-white/[0.02] rounded text-[7px] text-white/15">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.015] rounded-lg p-3 border border-white/[0.03] text-center">
            <div className="text-xl font-bold font-mono text-indigo-400">{totalWords.toLocaleString()}</div>
            <div className="text-white/10 text-[8px] font-bold uppercase tracking-widest mt-1">Total Words Analyzed</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
