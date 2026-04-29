// ============================================================
// SEFS Spatial Layout Engine v3 — Improved Clustering & Layout
// ============================================================
// Changes:
//   - Category-first clustering with agglomerative sub-clustering
//   - Category-aware force-directed layout (same-category attraction)
//   - Better initial positioning using category sectors
//   - Stronger separation between different categories
// ============================================================

import { ProcessedDocument, cosineSimilarity } from './textProcessing';

export interface Point2D { x: number; y: number; }

export interface ClusterInfo {
  id: number;
  label: string;
  category: string;
  centroid: Point2D;
  radius: number;
  color: string;
  nodeIds: string[];
  topTerms: string[];
  fileCount: number;
}

export interface FileNode {
  id: string;
  name: string;
  position: Point2D;
  targetPosition: Point2D;
  cluster: number;
  category: string;
  summary: string;
  wordCount: number;
  topTerms: string[];
  categoryScores?: Record<string, number>;
  color: string;
  size: number;
}

// ============================================================
// SIMILARITY MATRIX
// ============================================================
function buildSimilarityMatrix(documents: ProcessedDocument[]): number[][] {
  const n = documents.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = cosineSimilarity(documents[i].tfidf, documents[j].tfidf);
      matrix[i][j] = sim;
      matrix[j][i] = sim;
    }
    matrix[i][i] = 1;
  }
  return matrix;
}

// ============================================================
// 2D PROJECTION — Category-aware force-directed MDS
// ============================================================
export function projectTo2D(documents: ProcessedDocument[]): Point2D[] {
  const n = documents.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0.5, y: 0.5 }];

  const simMatrix = buildSimilarityMatrix(documents);

  // Build target distances:
  //   same-category: boosted similarity → smaller distance
  //   different-category: penalized → larger distance
  const targetDist: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const semanticSim = simMatrix[i][j];
      const sameCat = documents[i].category === documents[j].category;
      // Same category: add 0.5 similarity boost (pull together)
      // Different category: subtract 0.15 (push apart)
      const adjusted = sameCat
        ? Math.min(1, semanticSim + 0.5)
        : Math.max(0, semanticSim - 0.15);
      targetDist[i][j] = Math.sqrt(2 * (1 - adjusted));
    }
  }

  // Initialize positions in category-based sectors
  const categories = [...new Set(documents.map(d => d.category))];
  const catAngles = new Map<string, number>();
  categories.forEach((cat, i) => {
    catAngles.set(cat, (2 * Math.PI * i) / categories.length);
  });

  const points: Point2D[] = [];
  const catCounts = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    const cat = documents[i].category;
    const catIdx = catCounts.get(cat) || 0;
    catCounts.set(cat, catIdx + 1);
    const baseAngle = catAngles.get(cat) || 0;
    const jitter = (Math.random() - 0.5) * 0.1;
    const radius = 0.22 + (catIdx % 6) * 0.025;
    points.push({
      x: 0.5 + Math.cos(baseAngle + jitter) * radius,
      y: 0.5 + Math.sin(baseAngle + jitter) * radius,
    });
  }

  // Force-directed optimization
  const iterations = 500;
  const baseLR = 0.06;

  for (let iter = 0; iter < iterations; iter++) {
    const decay = 1 - (iter / iterations) * 0.9;
    const lr = baseLR * decay;

    for (let i = 0; i < n; i++) {
      let fx = 0, fy = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const currentDist = Math.sqrt(dx * dx + dy * dy) + 1e-10;
        const target = targetDist[i][j];
        const force = (currentDist - target) / currentDist;
        fx -= force * dx * lr;
        fy -= force * dy * lr;
      }
      points[i].x += fx;
      points[i].y += fy;
    }
  }

  // Normalize
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padding = 0.1;
  for (const p of points) {
    p.x = padding + ((p.x - minX) / rangeX) * (1 - 2 * padding);
    p.y = padding + ((p.y - minY) / rangeY) * (1 - 2 * padding);
  }

  return points;
}

// ============================================================
// CLUSTERING — Category-first, then agglomerative sub-clustering
// ============================================================
export function clusterDocuments(documents: ProcessedDocument[]): number[] {
  const n = documents.length;
  if (n === 0) return [];

  const labels: number[] = Array(n).fill(0);
  let nextClusterId = 0;

  // Group document indices by category
  const catGroups = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const cat = documents[i].category;
    if (!catGroups.has(cat)) catGroups.set(cat, []);
    catGroups.get(cat)!.push(i);
  }

  // For each category, optionally sub-cluster if group is large
  for (const [, indices] of catGroups) {
    if (indices.length <= 4) {
      // Small group: single cluster
      const cid = nextClusterId++;
      for (const idx of indices) labels[idx] = cid;
    } else {
      // Larger group: sub-cluster by semantic similarity
      const subClusters = agglomerativeCluster(documents, indices, 0.12);
      for (const sub of subClusters) {
        const cid = nextClusterId++;
        for (const idx of sub) labels[idx] = cid;
      }
    }
  }

  return labels;
}

function agglomerativeCluster(
  documents: ProcessedDocument[],
  indices: number[],
  minSimilarity: number
): number[][] {
  let clusters: number[][] = indices.map(idx => [idx]);

  const simCache = new Map<string, number>();
  function getSim(i: number, j: number): number {
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (simCache.has(key)) return simCache.get(key)!;
    const sim = cosineSimilarity(documents[i].tfidf, documents[j].tfidf);
    simCache.set(key, sim);
    return sim;
  }

  function clusterSimilarity(a: number[], b: number[]): number {
    let total = 0, count = 0;
    for (const i of a) for (const j of b) { total += getSim(i, j); count++; }
    return count > 0 ? total / count : 0;
  }

  while (clusters.length > 1) {
    let bestSim = -1, bestI = -1, bestJ = -1;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = clusterSimilarity(clusters[i], clusters[j]);
        if (sim > bestSim) { bestSim = sim; bestI = i; bestJ = j; }
      }
    }
    if (bestSim < minSimilarity) break;
    clusters[bestI] = [...clusters[bestI], ...clusters[bestJ]];
    clusters.splice(bestJ, 1);
  }

  return clusters;
}

// ============================================================
// COLORS & ICONS
// ============================================================
export const CATEGORY_COLORS: Record<string, string> = {
  Technology: '#818cf8', Science: '#60a5fa', Business: '#34d399',
  Health: '#f87171', Education: '#fbbf24', Legal: '#a78bfa',
  Arts: '#f472b6', Environment: '#2dd4bf', General: '#9ca3af',
};

export const CATEGORY_ICONS: Record<string, string> = {
  Technology: '💻', Science: '🔬', Business: '📊',
  Health: '🏥', Education: '📚', Legal: '⚖️',
  Arts: '🎨', Environment: '🌿', General: '📄',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.General;
}

// ============================================================
// BUILD FILE NODES
// ============================================================
export function buildFileNodes(documents: ProcessedDocument[]): FileNode[] {
  const positions = projectTo2D(documents);
  const clusters = clusterDocuments(documents);
  return documents.map((doc, i) => ({
    id: doc.id,
    name: doc.name,
    position: positions[i],
    targetPosition: positions[i],
    cluster: clusters[i],
    category: doc.category,
    summary: doc.summary,
    wordCount: doc.wordCount,
    topTerms: doc.topTerms,
    categoryScores: doc.categoryScores,
    color: getCategoryColor(doc.category),
    size: Math.max(8, Math.min(20, 8 + Math.log(doc.wordCount + 1) * 2)),
  }));
}

// ============================================================
// BUILD CLUSTER INFO
// ============================================================
export function buildClusterInfos(nodes: FileNode[], documents: ProcessedDocument[]): ClusterInfo[] {
  const clusterMap = new Map<number, { nodes: FileNode[]; docs: ProcessedDocument[] }>();
  for (let i = 0; i < nodes.length; i++) {
    const c = nodes[i].cluster;
    if (!clusterMap.has(c)) clusterMap.set(c, { nodes: [], docs: [] });
    clusterMap.get(c)!.nodes.push(nodes[i]);
    clusterMap.get(c)!.docs.push(documents[i]);
  }

  const infos: ClusterInfo[] = [];
  for (const [id, { nodes: cNodes, docs: cDocs }] of clusterMap) {
    // Dominant category
    const catCount = new Map<string, number>();
    for (const n of cNodes) catCount.set(n.category, (catCount.get(n.category) || 0) + 1);
    let domCat = 'General'; let maxC = 0;
    for (const [c, cnt] of catCount) { if (cnt > maxC) { maxC = cnt; domCat = c; } }

    // Centroid
    let cx = 0, cy = 0;
    for (const n of cNodes) { cx += n.position.x; cy += n.position.y; }
    cx /= cNodes.length; cy /= cNodes.length;

    // Radius
    let maxR = 0;
    for (const n of cNodes) {
      const dx = n.position.x - cx, dy = n.position.y - cy;
      maxR = Math.max(maxR, Math.sqrt(dx * dx + dy * dy));
    }

    // Top terms
    const termScores = new Map<string, number>();
    for (const doc of cDocs) {
      for (const [term, score] of doc.tfidf) {
        termScores.set(term, (termScores.get(term) || 0) + score);
      }
    }
    const topTerms = [...termScores.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

    const icon = CATEGORY_ICONS[domCat] || '📄';
    const termStr = topTerms.slice(0, 3).join(', ');
    const label = cNodes.length > 1
      ? `${icon} ${domCat}: ${termStr}`
      : `${icon} ${domCat}`;

    infos.push({
      id, label, category: domCat,
      centroid: { x: cx, y: cy },
      radius: Math.max(0.05, maxR + 0.04),
      color: getCategoryColor(domCat),
      nodeIds: cNodes.map(n => n.id),
      topTerms, fileCount: cNodes.length,
    });
  }

  infos.sort((a, b) => b.fileCount - a.fileCount);
  return infos;
}
