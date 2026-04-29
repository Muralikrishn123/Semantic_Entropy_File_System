import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Tag, BookOpen, Copy, Check } from 'lucide-react';
import { ProcessedDocument } from '../lib/textProcessing';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../lib/spatialLayout';

interface Props { document: ProcessedDocument; onClose: () => void; }

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

export function DocumentPreview({ document: doc, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const color = CATEGORY_COLORS[doc.category] || '#9ca3af';
  const icon = CATEGORY_ICONS[doc.category] || '📄';
  const sentences = useMemo(() => doc.content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0), [doc.content]);

  const handleCopy = () => { navigator.clipboard.writeText(doc.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-x-0 bottom-0 h-[50%] bg-[#090b18]/98 backdrop-blur-2xl border-t border-white/[0.05] z-50 flex flex-col overflow-hidden"
      style={{ right: '340px' }}>

      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: rgba(color, 0.08) }}>
            <FileText className="w-4 h-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-[12px] truncate">{doc.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px]">{icon}</span>
              <span className="text-[9px] font-semibold" style={{ color }}>{doc.category}</span>
              <span className="text-white/10 text-[9px]">·</span>
              <span className="text-white/20 text-[9px] font-mono">{doc.wordCount} words · {sentences.length} sentences</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleCopy} className="p-1.5 hover:bg-white/5 rounded-md text-white/20 hover:text-white/50 transition-all" title="Copy">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-md text-white/20 hover:text-white/50 transition-all"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-5 p-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-3">
              <BookOpen className="w-3.5 h-3.5 text-white/15" />
              <h3 className="text-white/20 text-[8px] font-bold uppercase tracking-widest">Content</h3>
            </div>
            <div className="bg-white/[0.015] rounded-xl p-4 border border-white/[0.03]">
              <p className="text-white/55 text-[12px] leading-[1.85] whitespace-pre-wrap">{doc.content}</p>
            </div>
          </div>
          <div className="w-[180px] flex-shrink-0 space-y-3.5">
            <div>
              <h4 className="text-white/18 text-[8px] font-bold uppercase tracking-widest mb-1.5">Summary</h4>
              <p className="text-white/35 text-[10px] leading-relaxed">{doc.summary}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Tag className="w-2.5 h-2.5 text-white/12" />
                <h4 className="text-white/18 text-[8px] font-bold uppercase tracking-widest">Key Terms</h4>
              </div>
              <div className="flex flex-wrap gap-1">
                {doc.topTerms.map(term => (
                  <span key={term} className="px-1.5 py-0.5 rounded text-[9px] font-medium border"
                    style={{ backgroundColor: rgba(color, 0.05), borderColor: rgba(color, 0.08), color: rgba(color, 0.6) }}>{term}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white/18 text-[8px] font-bold uppercase tracking-widest mb-1.5">Category Match</h4>
              <div className="space-y-0.5">
                {doc.categoryScores ? Object.entries(doc.categoryScores).sort((a, b) => b[1] - a[1]).slice(0, 5).filter(([, v]) => v > 0).map(([cat, score]) => (
                  <div key={cat} className="flex items-center gap-1">
                    <span className="text-[8px]">{CATEGORY_ICONS[cat] || '📄'}</span>
                    <span className="text-white/25 text-[8px] flex-1 truncate">{cat}</span>
                    <span className="text-white/12 text-[8px] font-mono">{score.toFixed(1)}</span>
                  </div>
                )) : (
                  <div className="text-white/10 text-[8px]">No match data</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
