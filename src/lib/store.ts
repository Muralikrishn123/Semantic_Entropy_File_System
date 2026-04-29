import { ProcessedDocument } from './textProcessing';
import { FileNode, ClusterInfo, getCategoryColor, CATEGORY_ICONS } from './spatialLayout';

export interface SEFSState {
  documents: ProcessedDocument[];
  fileNodes: FileNode[];
  clusters: ClusterInfo[];
  selectedNode: FileNode | null;
  hoveredNode: FileNode | null;
  searchQuery: string;
  showConnections: boolean;
  activeCluster: number | null;
}

export function createInitialState(): SEFSState {
  return {
    documents: [],
    fileNodes: [],
    clusters: [],
    selectedNode: null,
    hoveredNode: null,
    searchQuery: '',
    showConnections: true,
    activeCluster: null,
  };
}

export function hydrateState(
  state: SEFSState,
  apiDocuments: any[],
  apiClusters: any[]
): SEFSState {
  // Map API documents to ProcessedDocument
  const documents: ProcessedDocument[] = apiDocuments.map(d => ({
    id: d.id,
    name: d.name,
    content: d.content || '',
    terms: new Map(),
    tfidf: new Map(),
    category: d.category,
    summary: d.summary,
    wordCount: d.wordCount,
    topTerms: d.topTerms,
  }));

  // Map API documents to FileNode
  const fileNodes: FileNode[] = apiDocuments.map(d => ({
    id: d.id,
    name: d.name,
    position: d.position || { x: 0.5, y: 0.5 },
    targetPosition: d.position || { x: 0.5, y: 0.5 },
    cluster: d.cluster,
    category: d.category,
    summary: d.summary,
    wordCount: d.wordCount,
    topTerms: d.topTerms,
    color: getCategoryColor(d.category),
    size: Math.max(8, Math.min(20, 8 + Math.log(d.wordCount + 1) * 2)),
  }));

  // Map API clusters to ClusterInfo
  const clusters: ClusterInfo[] = apiClusters.map(c => ({
    id: c.id,
    label: c.size > 1 ? `${CATEGORY_ICONS[c.dominantCategory] || '📄'} ${c.dominantCategory}` : '',
    category: c.dominantCategory,
    centroid: c.centroid,
    radius: 0.15,
    color: getCategoryColor(c.dominantCategory),
    nodeIds: c.documents.map((d: any) => d.id),
    topTerms: c.topTerms,
    fileCount: c.size
  }));

  return {
    ...state,
    documents,
    fileNodes,
    clusters,
    selectedNode: state.selectedNode && fileNodes.find(n => n.id === state.selectedNode?.id) || null,
    hoveredNode: null,
  };
}
