import { CATEGORY_COLORS, CATEGORY_ICONS } from '../lib/spatialLayout';

const ALL_CATS = ['Technology','Science','Business','Health','Education','Legal','Arts','Environment','General'];

interface Props { activeCategories: Set<string>; }

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

export function Legend({ activeCategories }: Props) {
  const active = ALL_CATS.filter(c => activeCategories.has(c));
  if (active.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 glass rounded-2xl p-4 shadow-2xl shadow-black/30 min-w-[140px]">
      <div className="text-white/20 text-[8px] font-bold uppercase tracking-[0.2em] mb-3">Categories</div>
      <div className="space-y-1.5">
        {active.map(cat => {
          const color = CATEGORY_COLORS[cat] || '#9ca3af';
          return (
            <div key={cat} className="flex items-center gap-2.5 group">
              <span className="text-xs">{CATEGORY_ICONS[cat] || '📄'}</span>
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${hexAlpha(color, 0.3)}` }}
              />
              <span className="text-white/40 text-[10px] font-medium group-hover:text-white/60 transition-colors">{cat}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
