import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useToast } from '../components/ui/Toast';
import {
  ASSIGNMENT_DETAILS_SIDEBAR_KEY,
  computeAssignmentMetrics,
  filterAndSortComparisons,
  formatBytes,
} from '../components/assignment-details/assignmentDetailsUtils';
import type {
  AssignmentComparisonItem,
  AssignmentDetailsModel,
  AssignmentRepositoryItem,
  AssignmentSubmissionItem,
} from '../components/assignment-details/types';

interface UseAssignmentDetailsDataParams {
  assignmentId?: string;
  navigate: (path: string) => void;
}

export const useAssignmentDetailsData = ({ assignmentId, navigate }: UseAssignmentDetailsDataParams) => {
  const { showToast } = useToast();
  const [assignment, setAssignment] = useState<AssignmentDetailsModel | null>(null);
  const [comparisons, setComparisons] = useState<AssignmentComparisonItem[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmissionItem[]>([]);
  const [repositories, setRepositories] = useState<AssignmentRepositoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [selectedSimilarityRange, setSelectedSimilarityRange] = useState('All');
  const [similaritySortOrder, setSimilaritySortOrder] = useState<'desc' | 'asc'>('desc');

  const [showAnalysisMenu, setShowAnalysisMenu] = useState(false);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);

  const [isMobileLayout, setIsMobileLayout] = useState(() => window.innerWidth < 980);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(ASSIGNMENT_DETAILS_SIDEBAR_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return window.innerWidth < 1280;
  });

  const fetchDetails = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/instructor/login');
      return;
    }

    try {
      const [assignmentRes, comparisonsRes, submissionsRes, repositoriesRes] = await Promise.all([
        apiClient.get(`/instructor/assignments/${assignmentId}`, { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.get(`/instructor/assignments/${assignmentId}/comparisons`, { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.get(`/instructor/assignments/${assignmentId}/submissions`, { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.get(`/repositories/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] as AssignmentRepositoryItem[] })),
      ]);

      setAssignment(assignmentRes.data as AssignmentDetailsModel);
      setComparisons(comparisonsRes.data as AssignmentComparisonItem[]);
      setSubmissions(submissionsRes.data as AssignmentSubmissionItem[]);
      setRepositories(repositoriesRes.data as AssignmentRepositoryItem[]);
    } catch (error) {
      console.error(error);
      showToast('Failed to fetch assignment details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, navigate]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    const onResize = () => setIsMobileLayout(window.innerWidth < 980);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isMobileLayout) return;
    localStorage.setItem(ASSIGNMENT_DETAILS_SIDEBAR_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed, isMobileLayout]);

  const runAnalysis = useCallback(
    async (repoIds?: string[]) => {
      setTriggering(true);
      setShowAnalysisMenu(false);
      setShowRepoModal(false);

      const token = localStorage.getItem('token');
      try {
        const body = repoIds && repoIds.length > 0 ? { repository_ids: repoIds } : {};
        await apiClient.post(`/analysis/${assignmentId}/run`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const message =
          repoIds && repoIds.length > 0
            ? `Cross-repo analysis queued against ${repoIds.length} repository(ies). Results will appear automatically.`
            : 'Analysis queued — results will appear automatically when ready.';

        showToast(message, 'success');
        setAssignment((prev) => (prev ? { ...prev, status: 'Analyzing...' } : prev));
        setTimeout(() => fetchDetails(), 1500);
      } catch (error) {
        console.error(error);
        showToast('Failed to trigger analysis. Ensure students have submitted files first.', 'error');
      } finally {
        setTriggering(false);
      }
    },
    [assignmentId, showToast, fetchDetails]
  );

  const downloadSubmissions = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/instructor/login');
      return;
    }

    setDownloading(true);
    try {
      const response = await apiClient.get(`/instructor/assignments/${assignmentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'submissions.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const status =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      showToast(status === 404 ? 'No submissions found to download.' : 'Failed to download submissions.', status === 404 ? 'info' : 'error');
    } finally {
      setDownloading(false);
    }
  }, [assignmentId, navigate]);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasAnalyzingRef = useRef(false);

  useEffect(() => {
    const isAnalyzing = assignment?.status === 'Analyzing...';

    if (isAnalyzing) {
      wasAnalyzingRef.current = true;
      if (pollingRef.current) return;
      pollingRef.current = setInterval(() => {
        fetchDetails();
      }, 5000);
    } else {
      if (wasAnalyzingRef.current) {
        wasAnalyzingRef.current = false;
        showToast('Analysis complete — results are ready.', 'success');
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [assignment?.status, fetchDetails, showToast]);

  const metrics = useMemo(() => computeAssignmentMetrics(comparisons), [comparisons]);

  const filteredAndSortedComparisons = useMemo(
    () => filterAndSortComparisons(comparisons, selectedSimilarityRange, similaritySortOrder),
    [comparisons, selectedSimilarityRange, similaritySortOrder]
  );

  return {
    assignment,
    comparisons,
    submissions,
    repositories,
    loading,
    triggering,
    downloading,
    selectedSimilarityRange,
    similaritySortOrder,
    showAnalysisMenu,
    showRepoModal,
    selectedRepoIds,
    isMobileLayout,
    isSidebarCollapsed,
    metrics,
    filteredAndSortedComparisons,
    formatBytes,
    setSelectedSimilarityRange,
    setSimilaritySortOrder,
    setShowAnalysisMenu,
    setShowRepoModal,
    setSelectedRepoIds,
    setIsSidebarCollapsed,
    runAnalysis,
    downloadSubmissions,
  };
};
