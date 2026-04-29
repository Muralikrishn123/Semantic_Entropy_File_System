import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Trash2, ChevronDown, Link2, FolderOpen, FileText, Layers, Eye } from 'lucide-react';
import { FileNode, CATEGORY_ICONS, CATEGORY_COLORS } from '../lib/spatialLayout';
import { SEFSState } from '../lib/store';

interface Props {
  state: SEFSState;
  onSelectNode: (node: FileNode | null) => void;
  onRemoveDocument: (id: string) => void;
  onSearch: (query: string) => void;
  onToggleConnections: () => void;
  onClusterClick: (clusterId: number | null) => void;
  onPreviewDocument: (id: string) => void;
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

export function Sidebar({ state, onSelectNode, onRemoveDocument, onSearch, onToggleConnections, onClusterClick, onPreviewDocument }: Props) {
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'clusters' | 'files'>('clusters');

  const selected = state.selectedNode;
  const categories = new Map<string, FileNode[]>();
  for (const node of state.fileNodes) {
    if (!categories.has(node.category)) categories.set(node.category, []);
    categories.get(node.category)!.push(node);
  }

  const filteredNodes = state.searchQuery
    ? state.fileNodes.filter(n =>
      n.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      n.topTerms.some(t => t.includes(state.searchQuery.toLowerCase())))
    : state.fileNodes;

  return (
    <div className="w-[340px] h-full flex flex-col bg-[#08091a] border-l border-white/[0.04] overflow-hidden">
      {/* Search */}
      <div className="p-3.5 pb-2">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search documents..."
            value={state.searchQuery}
            onChange={e => onSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.05] rounded-lg pl-9 pr-3 py-2.5 text-[12px] text-white placeholder-white/15 focus:outline-none focus:border-indigo-500/30 focus:bg-white/[0.04] transition-all"
          />
          {state.searchQuery && (
            <button onClick={() => onSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="px-3.5 pb-2.5 flex items-center gap-1.5">
        <button onClick={onToggleConnections}
          className={`px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1 transition-all ${state.showConnections
              ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/15'
              : 'bg-white/[0.02] text-white/20 border border-white/[0.04] hover:bg-white/[0.04]'
            }`}>
          <Link2 className="w-3 h-3" /> Links
        </button>
        {state.activeCluster !== null && (
          <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => onClusterClick(null)}
            className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/15 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </motion.button>
        )}
        <span className="text-white/10 text-[9px] ml-auto font-mono">{filteredNodes.length} files</span>
      </div>

      {/* Selected node detail */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mx-3.5 mb-2.5 p-3.5 rounded-xl border" style={{ backgroundColor: rgba(selected.color, 0.03), borderColor: rgba(selected.color, 0.08) }}>
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color, boxShadow: `0 0 10px ${rgba(selected.color, 0.3)}` }} />
                    <h3 className="text-white font-bold text-[12px] truncate">{selected.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: rgba(selected.color, 0.12), color: selected.color }}>
                      {CATEGORY_ICONS[selected.category] || '📄'} {selected.category}
                    </span>
                    <span className="text-white/20 text-[9px] font-mono">{selected.wordCount}w</span>
                  </div>
                </div>
                <div className="flex gap-0.5 flex-shrink-0 ml-2">
                  <button onClick={() => onPreviewDocument(selected.id)} className="p-1.5 hover:bg-indigo-500/10 rounded-md text-white/15 hover:text-indigo-400 transition-all" title="Preview">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onRemoveDocument(selected.id)} className="p-1.5 hover:bg-red-500/10 rounded-md text-white/15 hover:text-red-400 transition-all" title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onSelectNode(null)} className="p-1.5 hover:bg-white/5 rounded-md text-white/15 hover:text-white/50 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-white/35 text-[11px] leading-relaxed mb-2.5">{selected.summary}</p>

              {selected.categoryScores && Object.keys(selected.categoryScores).length > 0 && (
                <div className="mb-3">
                  <h4 className="text-white/20 text-[7px] font-bold uppercase tracking-widest mb-1.5 opacity-50">Match Scores</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(selected.categoryScores)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .filter(([, v]) => v > 0)
                      .map(([cat, score]) => (
                        <div key={cat} className="flex items-center gap-1 px-1.5 py-0.5 bg-white/[0.02] rounded border border-white/[0.03]">
                          <span className="text-[8px]">{CATEGORY_ICONS[cat]}</span>
                          <span className="text-white/40 text-[8px] font-medium">{cat}</span>
                          <span className="text-white/20 text-[8px] font-mono">{score.toFixed(0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {selected.topTerms.slice(0, 6).map(term => (
                  <span key={term} className="px-1.5 py-0.5 bg-white/[0.03] rounded text-[9px] text-white/30 border border-white/[0.03]">{term}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab switcher */}
      <div className="px-3.5 pb-2 flex gap-1">
        {[
          { id: 'clusters' as const, label: 'Clusters', icon: Layers },
          { id: 'files' as const, label: 'All Files', icon: FileText },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${activeTab === tab.id
                ? 'bg-white/[0.05] text-white/60 border border-white/[0.06]'
                : 'text-white/20 hover:text-white/35 hover:bg-white/[0.02] border border-transparent'
              }`}>
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5">
        {activeTab === 'clusters' ? (
          <div className="space-y-0.5 mt-0.5">
            {state.clusters.length === 0 && state.fileNodes.length === 0 && (
              <div className="text-center py-16">
                <FolderOpen className="w-8 h-8 mx-auto mb-2.5 text-white/[0.05]" />
                <div className="text-white/12 text-[11px] font-medium">No clusters yet</div>
                <div className="text-white/8 text-[10px] mt-1">Add documents to see clusters</div>
              </div>
            )}
            {state.clusters.map(cluster => {
              const isActive = state.activeCluster === cluster.id;
              const isExpanded = expandedCluster === cluster.id;
              const icon = CATEGORY_ICONS[cluster.category] || '📁';
              const color = CATEGORY_COLORS[cluster.category] || '#9ca3af';
              const clusterNodes = state.fileNodes.filter(n => cluster.nodeIds.includes(n.id));

              return (
                <div key={cluster.id}>
                  <button
                    onClick={() => {
                      setExpandedCluster(isExpanded ? null : cluster.id);
                      onClusterClick(isActive ? null : cluster.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all group ${isActive ? 'border' : 'hover:bg-white/[0.02] border border-transparent'
                      }`}
                    style={isActive ? { backgroundColor: rgba(color, 0.05), borderColor: rgba(color, 0.1) } : undefined}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: rgba(color, 0.08) }}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/60 text-[11px] font-semibold truncate group-hover:text-white/80 transition-colors">{cluster.category}</div>
                      <div className="text-white/15 text-[9px] mt-0.5 truncate">{cluster.topTerms.slice(0, 3).join(' · ')}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: rgba(color, 0.12), color }}>{cluster.fileCount}</span>
                      <ChevronDown className={`w-3 h-3 text-white/10 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="ml-4 pl-3.5 border-l border-white/[0.04] py-0.5 space-y-0.5">
                          {clusterNodes.map(node => (
                            <div key={node.id} className="flex items-center gap-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); onSelectNode(selected?.id === node.id ? null : node); }}
                                className={`flex-1 text-left px-2.5 py-1.5 rounded-md text-[10px] transition-all flex items-center gap-2 ${selected?.id === node.id ? 'text-white border' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.02] border border-transparent'
                                  }`}
                                style={selected?.id === node.id ? { backgroundColor: rgba(color, 0.06), borderColor: rgba(color, 0.1) } : undefined}
                              >
                                <FileText className="w-3 h-3 flex-shrink-0 opacity-30" />
                                <span className="truncate">{node.name}</span>
                                <span className="text-[8px] text-white/10 ml-auto font-mono flex-shrink-0">{node.wordCount}w</span>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); onPreviewDocument(node.id); }}
                                className="p-1 hover:bg-white/5 rounded text-white/8 hover:text-white/30 transition-all flex-shrink-0" title="Preview">
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-0.5 mt-0.5">
            {[...categories.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cat, catNodes]) => {
              const color = CATEGORY_COLORS[cat] || '#9ca3af';
              const icon = CATEGORY_ICONS[cat] || '📄';
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-white/25">
                    <span className="text-[10px]">{icon}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider">{cat}</span>
                    <span className="text-[9px] font-mono ml-auto" style={{ color }}>{catNodes.length}</span>
                  </div>
                  {catNodes.filter(n => !state.searchQuery || filteredNodes.includes(n)).map(node => (
                    <div key={node.id} className="flex items-center gap-0.5 ml-2">
                      <button
                        onClick={() => onSelectNode(selected?.id === node.id ? null : node)}
                        className={`flex-1 text-left px-2.5 py-1.5 rounded-md text-[10px] transition-all flex items-center gap-2 ${selected?.id === node.id ? 'text-white border' : 'text-white/30 hover:text-white/45 hover:bg-white/[0.02] border border-transparent'
                          }`}
                        style={selected?.id === node.id ? { backgroundColor: rgba(color, 0.05), borderColor: rgba(color, 0.1) } : undefined}
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="truncate">{node.name}</span>
                        <span className="text-[8px] text-white/10 ml-auto font-mono flex-shrink-0">{node.wordCount}w</span>
                      </button>
                      <button onClick={() => onPreviewDocument(node.id)}
                        className="p-1 hover:bg-white/5 rounded text-white/8 hover:text-white/30 transition-all flex-shrink-0" title="Preview">
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="p-3.5 border-t border-white/[0.03]">
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: state.fileNodes.length, label: 'Files', color: '#818cf8' },
            { val: categories.size, label: 'Categories', color: '#34d399' },
            { val: state.clusters.length, label: 'Clusters', color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
              <div className="text-white/10 text-[7px] font-bold uppercase tracking-[0.15em] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
