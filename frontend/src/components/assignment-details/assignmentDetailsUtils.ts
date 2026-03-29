import type {
  AssignmentComparisonItem,
  AssignmentMetrics,
  AssignmentSubmissionItem,
} from './types';

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
