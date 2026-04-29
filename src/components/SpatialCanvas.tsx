import { useRef, useEffect, useCallback, useState } from 'react';
import { FileNode } from '../lib/spatialLayout';
import { SEFSState } from '../lib/store';

interface Props {
  state: SEFSState;
  onSelectNode: (node: FileNode | null) => void;
  onHoverNode: (node: FileNode | null) => void;
  onClusterClick: (clusterId: number | null) => void;
  showHeatmap: boolean;
}

interface AnimNode extends FileNode {
  cx: number; cy: number; vx: number; vy: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function SpatialCanvas({ state, onSelectNode, onHoverNode, onClusterClick, showHeatmap }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animNodesRef = useRef<AnimNode[]>([]);
  const frameRef = useRef(0);
  const camRef = useRef({ x: 0.5, y: 0.5, zoom: 1.2 });
  const dragRef = useRef({ active: false, sx: 0, sy: 0, cx: 0, cy: 0 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: FileNode } | null>(null);

  const w2s = useCallback((wx: number, wy: number, cw: number, ch: number) => {
    const cam = camRef.current;
    const s = Math.min(cw, ch) * cam.zoom;
    return { sx: (wx - cam.x) * s + cw / 2, sy: (wy - cam.y) * s + ch / 2 };
  }, []);

  const s2w = useCallback((sx: number, sy: number, cw: number, ch: number) => {
    const cam = camRef.current;
    const s = Math.min(cw, ch) * cam.zoom;
    return { wx: (sx - cw / 2) / s + cam.x, wy: (sy - ch / 2) / s + cam.y };
  }, []);

  // Sync animated nodes with state
  useEffect(() => {
    const existing = new Map(animNodesRef.current.map(n => [n.id, n]));
    animNodesRef.current = state.fileNodes.map(node => {
      const ex = existing.get(node.id);
      return {
        ...node,
        cx: ex ? ex.cx : 0.5 + (Math.random() - 0.5) * 0.2,
        cy: ex ? ex.cy : 0.5 + (Math.random() - 0.5) * 0.2,
        vx: 0, vy: 0,
      };
    });
  }, [state.fileNodes]);

  // Center camera when docs first load
  useEffect(() => {
    if (state.fileNodes.length > 0) {
      let cx = 0, cy = 0;
      for (const n of state.fileNodes) { cx += n.position.x; cy += n.position.y; }
      camRef.current.x = cx / state.fileNodes.length;
      camRef.current.y = cy / state.fileNodes.length;
      camRef.current.zoom = 1.2;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fileNodes.length]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let running = true;

    const render = () => {
      if (!running) return;
      const cont = containerRef.current;
      if (!cont) { frameRef.current = requestAnimationFrame(render); return; }
      const rect = cont.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      const w = rect.width, h = rect.height;

      // Background
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, '#0d0f1e');
      bgGrad.addColorStop(1, '#060810');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Dot grid
      const gridStep = 0.04;
      const tl = s2w(0, 0, w, h);
      const br = s2w(w, h, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.012)';
      for (let gx = Math.floor(tl.wx / gridStep) * gridStep; gx <= br.wx; gx += gridStep) {
        for (let gy = Math.floor(tl.wy / gridStep) * gridStep; gy <= br.wy; gy += gridStep) {
          const { sx, sy } = w2s(gx, gy, w, h);
          ctx.beginPath();
          ctx.arc(sx, sy, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const nodes = animNodesRef.current;
      const t = Date.now() * 0.001;

      // Spring physics
      for (const n of nodes) {
        const dx = n.position.x - n.cx;
        const dy = n.position.y - n.cy;
        n.vx = (n.vx + dx * 0.04) * 0.85;
        n.vy = (n.vy + dy * 0.04) * 0.85;
        n.cx += n.vx;
        n.cy += n.vy;
      }

      // ===== HEATMAP =====
      if (showHeatmap && nodes.length > 0) {
        for (const node of nodes) {
          const { sx, sy } = w2s(node.cx, node.cy, w, h);
          const radius = 130 * camRef.current.zoom;
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
          const [r, g, b] = hexToRgb(node.color);
          grad.addColorStop(0, `rgba(${r},${g},${b},0.15)`);
          grad.addColorStop(0.4, `rgba(${r},${g},${b},0.04)`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ===== CLUSTER FOLDER SHAPES =====
      for (const cl of state.clusters) {
        if (cl.nodeIds.length < 1) continue;
        const cNodes = nodes.filter(n => cl.nodeIds.includes(n.id));
        if (cNodes.length === 0) continue;

        let acx = 0, acy = 0;
        for (const cn of cNodes) { acx += cn.cx; acy += cn.cy; }
        acx /= cNodes.length; acy /= cNodes.length;

        let maxR = 0;
        for (const cn of cNodes) {
          const dx2 = cn.cx - acx, dy2 = cn.cy - acy;
          maxR = Math.max(maxR, Math.sqrt(dx2 * dx2 + dy2 * dy2));
        }

        const center = w2s(acx, acy, w, h);
        const scale = Math.min(w, h) * camRef.current.zoom;
        const r = Math.max(60, maxR * scale + 65);
        const isActive = state.activeCluster === cl.id;

        // --- FOLDER SHAPE ---
        const fw = r * 2.2;
        const fh = r * 1.8;
        const fx = center.sx - fw / 2;
        const fy = center.sy - fh / 2 + 12;
        const tabW = Math.min(fw * 0.45, 110);
        const tabH = 22;
        const cornerR = 10;

        // Folder body fill
        ctx.save();
        ctx.beginPath();
        // Tab shape
        ctx.moveTo(fx + cornerR, fy);
        ctx.lineTo(fx + tabW - 8, fy);
        ctx.lineTo(fx + tabW + 8, fy + tabH);
        ctx.lineTo(fx + fw - cornerR, fy + tabH);
        ctx.arcTo(fx + fw, fy + tabH, fx + fw, fy + tabH + cornerR, cornerR);
        ctx.lineTo(fx + fw, fy + fh - cornerR);
        ctx.arcTo(fx + fw, fy + fh, fx + fw - cornerR, fy + fh, cornerR);
        ctx.lineTo(fx + cornerR, fy + fh);
        ctx.arcTo(fx, fy + fh, fx, fy + fh - cornerR, cornerR);
        ctx.lineTo(fx, fy + cornerR);
        ctx.arcTo(fx, fy, fx + cornerR, fy, cornerR);
        ctx.closePath();

        // Fill
        const folderGrad = ctx.createLinearGradient(fx, fy, fx, fy + fh);
        folderGrad.addColorStop(0, rgba(cl.color, isActive ? 0.07 : 0.025));
        folderGrad.addColorStop(1, rgba(cl.color, isActive ? 0.03 : 0.008));
        ctx.fillStyle = folderGrad;
        ctx.fill();

        // Border
        ctx.strokeStyle = rgba(cl.color, isActive ? 0.35 : 0.1);
        ctx.lineWidth = isActive ? 1.5 : 0.8;
        ctx.setLineDash(isActive ? [] : [6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Tab label
        const labelFs = Math.max(9, Math.min(11, 10 * camRef.current.zoom));
        const rawLabel = cl.label.length > 35 ? cl.label.substring(0, 33) + '…' : cl.label;
        ctx.font = `700 ${labelFs}px "Inter", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(cl.color, isActive ? 0.9 : 0.5);
        ctx.fillText(rawLabel, fx + 10, fy + tabH / 2);

        // File count badge
        const countStr = `${cNodes.length}`;
        const cfs = Math.max(8, 9 * camRef.current.zoom);
        ctx.font = `700 ${cfs}px "JetBrains Mono", monospace`;
        const bw = ctx.measureText(countStr).width + 12;
        const bh = cfs + 6;
        const bx = fx + fw - bw - 8;
        const by = fy + 4;
        ctx.fillStyle = rgba(cl.color, 0.15);
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, bh / 2);
        ctx.fill();
        ctx.fillStyle = rgba(cl.color, 0.8);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countStr, bx + bw / 2, by + bh / 2);

        // Terms at bottom of folder
        if (cl.topTerms.length > 0 && camRef.current.zoom > 0.5) {
          const termsStr = cl.topTerms.slice(0, 3).join(' · ');
          ctx.font = `400 ${Math.max(7, 8 * camRef.current.zoom)}px "Inter", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = rgba(cl.color, 0.2);
          ctx.fillText(termsStr, center.sx, fy + fh - 10);
        }
      }

      // ===== CONNECTION LINES =====
      if (state.showConnections) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[i].cluster !== nodes[j].cluster) continue;
            const p1 = w2s(nodes[i].cx, nodes[i].cy, w, h);
            const p2 = w2s(nodes[j].cx, nodes[j].cy, w, h);
            const dx = p2.sx - p1.sx, dy = p2.sy - p1.sy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 400) {
              const a = Math.max(0.01, 0.05 - dist / 8000);
              ctx.beginPath();
              ctx.moveTo(p1.sx, p1.sy);
              ctx.lineTo(p2.sx, p2.sy);
              ctx.strokeStyle = rgba(nodes[i].color, a);
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      // ===== FILE NODES (document icons) =====
      for (const node of nodes) {
        const { sx, sy } = w2s(node.cx, node.cy, w, h);
        const baseSize = node.size * camRef.current.zoom;
        const isHov = state.hoveredNode?.id === node.id;
        const isSel = state.selectedNode?.id === node.id;
        const isClusterDim = state.activeCluster !== null && node.cluster !== state.activeCluster;
        const isSearchDim = state.searchQuery &&
          !node.name.toLowerCase().includes(state.searchQuery.toLowerCase()) &&
          !node.category.toLowerCase().includes(state.searchQuery.toLowerCase()) &&
          !node.topTerms.some(tt => tt.includes(state.searchQuery.toLowerCase()));
        const dimmed = isClusterDim || !!isSearchDim;

        const pulse = isSel ? 1 + Math.sin(t * 3) * 0.07 : 1;
        const hoverScale = isHov ? 1.25 : 1;
        const sz = baseSize * pulse * hoverScale;

        ctx.save();
        ctx.globalAlpha = dimmed ? 0.05 : 1;

        // Document icon shape
        const iw = sz * 1.4;
        const ih = sz * 1.8;
        const ix = sx - iw / 2;
        const iy = sy - ih / 2;
        const foldSize = sz * 0.45;
        const cr = 3;

        // Shadow
        if (!dimmed) {
          ctx.shadowColor = rgba(node.color, isSel ? 0.5 : isHov ? 0.35 : 0.15);
          ctx.shadowBlur = isSel ? 25 : isHov ? 18 : 8;
          ctx.shadowOffsetY = 2;
        }

        // Document body with folded corner
        ctx.beginPath();
        ctx.moveTo(ix + cr, iy);
        ctx.lineTo(ix + iw - foldSize, iy);
        ctx.lineTo(ix + iw, iy + foldSize);
        ctx.lineTo(ix + iw, iy + ih - cr);
        ctx.arcTo(ix + iw, iy + ih, ix + iw - cr, iy + ih, cr);
        ctx.lineTo(ix + cr, iy + ih);
        ctx.arcTo(ix, iy + ih, ix, iy + ih - cr, cr);
        ctx.lineTo(ix, iy + cr);
        ctx.arcTo(ix, iy, ix + cr, iy, cr);
        ctx.closePath();

        // Fill gradient
        const [r, g, b] = hexToRgb(node.color);
        const docGrad = ctx.createLinearGradient(ix, iy, ix, iy + ih);
        docGrad.addColorStop(0, `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)},0.9)`);
        docGrad.addColorStop(1, `rgba(${r},${g},${b},0.7)`);
        ctx.fillStyle = docGrad;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Folded corner triangle
        ctx.beginPath();
        ctx.moveTo(ix + iw - foldSize, iy);
        ctx.lineTo(ix + iw - foldSize, iy + foldSize);
        ctx.lineTo(ix + iw, iy + foldSize);
        ctx.closePath();
        ctx.fillStyle = `rgba(0,0,0,0.15)`;
        ctx.fill();

        // Text lines inside document
        const lineY = iy + foldSize + 4;
        const lineGap = Math.max(2.5, sz * 0.25);
        ctx.fillStyle = `rgba(255,255,255,0.15)`;
        for (let li = 0; li < 3; li++) {
          const lw = iw * (li === 2 ? 0.55 : 0.72);
          const ly = lineY + li * lineGap;
          if (ly < iy + ih - 4) {
            ctx.beginPath();
            ctx.roundRect(ix + 3, ly, lw, 1.5, 0.75);
            ctx.fill();
          }
        }

        // Selection ring
        if (isSel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(ix - 3, iy - 3, iw + 6, ih + 6, cr + 3);
          ctx.stroke();
          ctx.strokeStyle = rgba(node.color, 0.3);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(ix - 6, iy - 6, iw + 12, ih + 12, cr + 6);
          ctx.stroke();
        } else if (isHov) {
          ctx.strokeStyle = rgba(node.color, 0.6);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(ix - 2, iy - 2, iw + 4, ih + 4, cr + 2);
          ctx.stroke();
        }

        // Label
        if (camRef.current.zoom > 0.35 || isHov || isSel) {
          const fs = Math.max(8, 10 * camRef.current.zoom);
          const labelY = iy + ih + fs + 6;
          ctx.font = `${isSel || isHov ? '600' : '400'} ${fs}px "Inter", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const displayName = node.name.length > 22 ? node.name.substring(0, 20) + '…' : node.name;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillText(displayName, sx + 1, labelY + 1);
          ctx.fillStyle = `rgba(255,255,255,${dimmed ? 0.1 : isSel ? 1 : isHov ? 0.85 : 0.5})`;
          ctx.fillText(displayName, sx, labelY);
          // Category
          ctx.font = `500 ${Math.max(7, 8 * camRef.current.zoom)}px "Inter", sans-serif`;
          ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.05)' : rgba(node.color, 0.55);
          ctx.fillText(node.category, sx, labelY + fs + 2);
        }

        ctx.restore();
      }

      // ===== MINIMAP =====
      if (nodes.length > 2) {
        const mmW = 120, mmH = 90, mmPad = 14;
        const mmX = w - mmW - mmPad, mmY = h - mmH - mmPad;
        ctx.fillStyle = 'rgba(8,10,20,0.9)';
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(mmX, mmY, mmW, mmH, 8);
        ctx.fill();
        ctx.stroke();

        let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
        for (const n of nodes) {
          mnX = Math.min(mnX, n.cx); mxX = Math.max(mxX, n.cx);
          mnY = Math.min(mnY, n.cy); mxY = Math.max(mxY, n.cy);
        }
        const rngX = mxX - mnX || 1, rngY = mxY - mnY || 1;
        const mPad = 8;
        for (const n of nodes) {
          const nx = mmX + mPad + ((n.cx - mnX) / rngX) * (mmW - mPad * 2);
          const ny = mmY + mPad + ((n.cy - mnY) / rngY) * (mmH - mPad * 2);
          ctx.fillStyle = rgba(n.color, 0.7);
          ctx.beginPath();
          ctx.arc(nx, ny, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        const cam = camRef.current;
        const viewScale = Math.min(w, h) * cam.zoom;
        const vpL = cam.x - (w / 2) / viewScale;
        const vpR = cam.x + (w / 2) / viewScale;
        const vpT = cam.y - (h / 2) / viewScale;
        const vpB = cam.y + (h / 2) / viewScale;
        const vx1 = mmX + mPad + ((vpL - mnX) / rngX) * (mmW - mPad * 2);
        const vy1 = mmY + mPad + ((vpT - mnY) / rngY) * (mmH - mPad * 2);
        const vx2 = mmX + mPad + ((vpR - mnX) / rngX) * (mmW - mPad * 2);
        const vy2 = mmY + mPad + ((vpB - mnY) / rngY) * (mmH - mPad * 2);
        ctx.strokeStyle = 'rgba(99,102,241,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          Math.max(mmX, vx1), Math.max(mmY, vy1),
          Math.min(mmW, vx2 - vx1), Math.min(mmH, vy2 - vy1)
        );
      }

      // Floating particles
      for (let i = 0; i < 8; i++) {
        const px = Math.sin(t * 0.1 + i * 2.8) * 0.4 + 0.5;
        const py = Math.cos(t * 0.08 + i * 2.3) * 0.4 + 0.5;
        const { sx: psx, sy: psy } = w2s(px, py, w, h);
        ctx.fillStyle = `rgba(99,102,241,${0.012 + Math.sin(t + i) * 0.006})`;
        ctx.beginPath();
        ctx.arc(psx, psy, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [state, w2s, s2w, showHeatmap]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const nodes = animNodesRef.current;

    // Check node clicks
    for (const node of [...nodes].reverse()) {
      const { sx, sy } = w2s(node.cx, node.cy, rect.width, rect.height);
      const sz = node.size * camRef.current.zoom * 1.5;
      const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
      if (dist < sz + 8) { onSelectNode(node); return; }
    }

    // Check cluster clicks
    for (const cl of state.clusters) {
      const cNodes = nodes.filter(n => cl.nodeIds.includes(n.id));
      if (cNodes.length === 0) continue;
      let acx = 0, acy = 0;
      for (const cn of cNodes) { acx += cn.cx; acy += cn.cy; }
      acx /= cNodes.length; acy /= cNodes.length;
      const center = w2s(acx, acy, rect.width, rect.height);
      let maxR = 0;
      for (const cn of cNodes) {
        const dx2 = cn.cx - acx, dy2 = cn.cy - acy;
        maxR = Math.max(maxR, Math.sqrt(dx2 * dx2 + dy2 * dy2));
      }
      const scale = Math.min(rect.width, rect.height) * camRef.current.zoom;
      const r = Math.max(60, maxR * scale + 65);
      const fw = r * 2.2, fh = r * 1.8;
      if (mx >= center.sx - fw / 2 && mx <= center.sx + fw / 2 &&
        my >= center.sy - fh / 2 + 12 && my <= center.sy + fh / 2 + 12) {
        onClusterClick(state.activeCluster === cl.id ? null : cl.id);
        onSelectNode(null);
        return;
      }
    }

    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, cx: camRef.current.x, cy: camRef.current.y };
    onSelectNode(null);
    onClusterClick(null);
  }, [w2s, onSelectNode, onClusterClick, state.clusters, state.activeCluster]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (dragRef.current.active) {
      const cam = camRef.current;
      const rect = canvas.getBoundingClientRect();
      const s = Math.min(rect.width, rect.height) * cam.zoom;
      cam.x = dragRef.current.cx - (e.clientX - dragRef.current.sx) / s;
      cam.y = dragRef.current.cy - (e.clientY - dragRef.current.sy) / s;
      setTooltip(null);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const nodes = animNodesRef.current;
    let found = false;
    for (const node of [...nodes].reverse()) {
      const { sx, sy } = w2s(node.cx, node.cy, rect.width, rect.height);
      const sz = node.size * camRef.current.zoom * 1.5;
      const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
      if (dist < sz + 8) {
        onHoverNode(node);
        setTooltip({ x: e.clientX, y: e.clientY, node });
        canvas.style.cursor = 'pointer';
        found = true;
        break;
      }
    }
    if (!found) {
      onHoverNode(null);
      setTooltip(null);
      canvas.style.cursor = dragRef.current.active ? 'grabbing' : 'grab';
    }
  }, [w2s, onHoverNode]);

  const handleMouseUp = useCallback(() => { dragRef.current.active = false; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      camRef.current.zoom = Math.max(0.2, Math.min(6, camRef.current.zoom * factor));
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-5 right-40 flex flex-col gap-1">
        <button onClick={() => { camRef.current.zoom = Math.min(6, camRef.current.zoom * 1.4); }}
          className="w-9 h-9 glass rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-base font-light">+</button>
        <button onClick={() => { camRef.current.zoom = Math.max(0.2, camRef.current.zoom * 0.7); }}
          className="w-9 h-9 glass rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-base font-light">−</button>
        <button onClick={() => { camRef.current = { x: 0.5, y: 0.5, zoom: 1.2 }; }}
          className="w-9 h-9 glass rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs">⟲</button>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-[999] pointer-events-none" style={{ left: tooltip.x + 18, top: tooltip.y - 8 }}>
          <div className="glass-strong rounded-2xl p-4 shadow-2xl shadow-black/60 max-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: tooltip.node.color, boxShadow: `0 0 10px ${rgba(tooltip.node.color, 0.4)}` }} />
              <span className="text-white font-semibold text-[12px] truncate">{tooltip.node.name}</span>
            </div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
                backgroundColor: rgba(tooltip.node.color, 0.15),
                color: tooltip.node.color,
                border: `1px solid ${rgba(tooltip.node.color, 0.2)}`
              }}>{tooltip.node.category}</span>
              <span className="text-white/25 text-[9px] font-mono">{tooltip.node.wordCount} words</span>
            </div>
            <p className="text-white/45 text-[11px] leading-relaxed mb-2.5">{tooltip.node.summary}</p>
            <div className="flex flex-wrap gap-1">
              {tooltip.node.topTerms.slice(0, 4).map(term => (
                <span key={term} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/30 border border-white/[0.04]">{term}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
