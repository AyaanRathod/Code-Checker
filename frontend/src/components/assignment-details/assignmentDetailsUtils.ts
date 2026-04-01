import type {
  AssignmentComparisonItem,
  AssignmentMetrics,
  AssignmentSubmissionItem,
} from './types';

export interface CollusionGraphNode {
  id: string;
  display: string;
  fullLabel: string;
  clusterId: number;
  x: number;
  y: number;
}

export interface CollusionGraphEdge {
  id: string;
  from: string;
  to: string;
  score: number;
  comparisonId: string;
}

export interface CollusionCluster {
  id: number;
  members: string[];
  memberLabels: string[];
  pairCount: number;
  avgScore: number;
  maxScore: number;
  risk: 'High Risk' | 'Review';
}

export interface CollusionGraphData {
  clusters: CollusionCluster[];
  edges: CollusionGraphEdge[];
  nodes: CollusionGraphNode[];
  totalInternalPairs: number;
}

const shortId = (value: string) => (value.length > 9 ? `${value.slice(0, 9)}...` : value);

const studentKey = (comparison: AssignmentComparisonItem, side: 'source' | 'target') => {
  const raw = side === 'source' ? comparison.raw_source_id : comparison.raw_target_id;
  const masked = side === 'source' ? comparison.source_student : comparison.target_student;
  return raw && raw.trim().length > 0 ? raw : masked;
};

export const buildCollusionGraphData = (
  comparisons: AssignmentComparisonItem[],
  minScore = 70,
  viewport: { width: number; height: number } = { width: 860, height: 500 }
): CollusionGraphData => {
  const internalComparisons = comparisons.filter((comparison) => (comparison.comparison_type ?? 'internal') === 'internal');

  const edges: CollusionGraphEdge[] = internalComparisons
    .filter((comparison) => comparison.score >= minScore)
    .map((comparison) => ({
      id: comparison.id,
      from: studentKey(comparison, 'source'),
      to: studentKey(comparison, 'target'),
      score: comparison.score,
      comparisonId: comparison.id,
    }))
    .filter((edge) => edge.from !== edge.to);

  const adjacency = new Map<string, Set<string>>();
  const displayLabel = new Map<string, string>();

  edges.forEach((edge) => {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  });

  internalComparisons.forEach((comparison) => {
    const source = studentKey(comparison, 'source');
    const target = studentKey(comparison, 'target');
    displayLabel.set(source, comparison.source_student);
    displayLabel.set(target, comparison.target_student);
  });

  const visited = new Set<string>();
  const clusters: CollusionCluster[] = [];
  let clusterId = 1;

  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue;
    const stack = [start];
    const members: string[] = [];
    visited.add(start);

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      members.push(current);
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      });
    }

    if (members.length < 2) continue;

    const clusterEdges = edges.filter((edge) => members.includes(edge.from) && members.includes(edge.to));
    if (clusterEdges.length === 0) continue;

    const total = clusterEdges.reduce((acc, edge) => acc + edge.score, 0);
    const max = clusterEdges.reduce((acc, edge) => Math.max(acc, edge.score), 0);

    const memberLabels = members.map((member) => displayLabel.get(member) || shortId(member));

    clusters.push({
      id: clusterId,
      members,
      memberLabels,
      pairCount: clusterEdges.length,
      avgScore: total / clusterEdges.length,
      maxScore: max,
      risk: max >= 80 || members.length >= 4 ? 'High Risk' : 'Review',
    });
    clusterId += 1;
  }

  clusters.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === 'High Risk' ? -1 : 1;
    return b.maxScore - a.maxScore;
  });

  const positionByNode = new Map<string, { x: number; y: number }>();
  const nodes: CollusionGraphNode[] = [];
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const clusterCount = Math.max(1, clusters.length);

  clusters.forEach((cluster, index) => {
    const minDimension = Math.min(viewport.width, viewport.height);
    const memberRadius = Math.max(12, Math.min(minDimension * 0.2, 24 + cluster.members.length * 2.4));
    const maxOrbit = Math.max(0, minDimension / 2 - memberRadius - 10);
    const angle = (index / clusterCount) * Math.PI * 2;
    const orbitRadius = clusterCount > 1 ? maxOrbit : 0;
    const clusterCenterX = centerX + Math.cos(angle) * orbitRadius;
    const clusterCenterY = centerY + Math.sin(angle) * orbitRadius;

    cluster.members.forEach((member, memberIndex) => {
      const memberAngle = (memberIndex / cluster.members.length) * Math.PI * 2;
      const x = clusterCenterX + Math.cos(memberAngle) * memberRadius;
      const y = clusterCenterY + Math.sin(memberAngle) * memberRadius;

      positionByNode.set(member, { x, y });
      nodes.push({
        id: member,
        display: shortId(displayLabel.get(member) || member),
        fullLabel: displayLabel.get(member) || member,
        clusterId: cluster.id,
        x,
        y,
      });
    });
  });

  const filteredEdges = edges.filter((edge) => positionByNode.has(edge.from) && positionByNode.has(edge.to));

  return {
    clusters,
    edges: filteredEdges,
    nodes,
    totalInternalPairs: internalComparisons.length,
  };
};

export const ASSIGNMENT_DETAILS_SIDEBAR_KEY = 'assignmentDetailsSidebarCollapsed';

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const computeAssignmentMetrics = (comparisons: AssignmentComparisonItem[]): AssignmentMetrics => {
  if (!comparisons.length) {
    return { total: 0, highRisk: 0, reviews: 0, avg: 0, distribution: [0, 0, 0, 0, 0], maxInDist: 1 };
  }

  let highRisk = 0;
  let reviews = 0;
  let sum = 0;
  const dist = [0, 0, 0, 0, 0];

  comparisons.forEach((comparison) => {
    sum += comparison.score;
    if (comparison.score > 80) highRisk++;
    else if (comparison.score > 60) reviews++;

    if (comparison.score < 20) dist[0]++;
    else if (comparison.score < 40) dist[1]++;
    else if (comparison.score < 60) dist[2]++;
    else if (comparison.score < 80) dist[3]++;
    else dist[4]++;
  });

  return {
    total: comparisons.length,
    highRisk,
    reviews,
    avg: sum / comparisons.length,
    distribution: dist,
    maxInDist: Math.max(...dist) || 1,
  };
};

export const filterAndSortComparisons = (
  comparisons: AssignmentComparisonItem[],
  selectedSimilarityRange: string,
  similaritySortOrder: 'desc' | 'asc'
) => {
  const filtered = comparisons.filter((comparison) => {
    switch (selectedSimilarityRange) {
      case '0-20':
        return comparison.score >= 0 && comparison.score <= 20;
      case '21-40':
        return comparison.score >= 21 && comparison.score <= 40;
      case '41-60':
        return comparison.score >= 41 && comparison.score <= 60;
      case '61-80':
        return comparison.score >= 61 && comparison.score <= 80;
      case '81-100':
        return comparison.score >= 81 && comparison.score <= 100;
      default:
        return true;
    }
  });

  return [...filtered].sort((a, b) => (similaritySortOrder === 'desc' ? b.score - a.score : a.score - b.score));
};

export const buildUniqueMatrixIds = (comparisons: AssignmentComparisonItem[]) =>
  Array.from(new Set(comparisons.flatMap((comparison) => [comparison.source_student, comparison.target_student]))).sort();

export const findComparisonPair = (
  comparisons: AssignmentComparisonItem[],
  rowId: string,
  colId: string
) =>
  comparisons.find(
    (comparison) =>
      (comparison.source_student === rowId && comparison.target_student === colId) ||
      (comparison.source_student === colId && comparison.target_student === rowId)
  ) || null;

export const getSubmissionsCount = (submissions: AssignmentSubmissionItem[]) => submissions.length;
