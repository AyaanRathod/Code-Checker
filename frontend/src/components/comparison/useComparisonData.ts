import { useEffect, useState } from 'react';
import apiClient from '../../lib/apiClient';
import { useToast } from '../ui/Toast';
import type { AssignmentComparison, AssignmentSummary, ComparisonData, OtherAssignmentMatch } from './types';
import { getIdentityTokens } from './comparisonUtils';

interface UseComparisonDataParams {
  comparisonId?: string;
  navigate: (to: string) => void;
}

interface UseComparisonDataResult {
  data: ComparisonData | null;
  loading: boolean;
  otherAssignmentMatches: OtherAssignmentMatch[];
  otherMatchesLoading: boolean;
  currentAssignmentId: string | null;
}

export const useComparisonData = ({ comparisonId, navigate }: UseComparisonDataParams): UseComparisonDataResult => {
  const { showToast } = useToast();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [otherAssignmentMatches, setOtherAssignmentMatches] = useState<OtherAssignmentMatch[]>([]);
  const [otherMatchesLoading, setOtherMatchesLoading] = useState(true);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/instructor/login');
        return;
      }

      try {
        const response = await apiClient.get(`/instructor/comparisons/${comparisonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(response.data as ComparisonData);
      } catch (error) {
        console.error(error);
        showToast('Failed to load comparison data.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [comparisonId, navigate]);

  useEffect(() => {
    if (!data) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const currentIds = new Set<string>();
    getIdentityTokens(data.source_student_decrypted || '').forEach((identityToken) => currentIds.add(identityToken));

    if (currentIds.size === 0) {
      setOtherAssignmentMatches([]);
      setOtherMatchesLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOtherAssignmentMatches = async () => {
      setOtherMatchesLoading(true);

      try {
        const assignmentsResponse = await apiClient.get(`/instructor/assignments`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const assignments: AssignmentSummary[] = assignmentsResponse.data;
        const comparisonResults = await Promise.allSettled(
          assignments.map(async (assignment) => {
            const comparisonsResponse = await apiClient.get(`/instructor/assignments/${assignment.id}/comparisons`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            return {
              assignment,
              comparisons: comparisonsResponse.data as AssignmentComparison[],
            };
          })
        );

        const assignmentComparisons = comparisonResults
          .filter(
            (result): result is PromiseFulfilledResult<{ assignment: AssignmentSummary; comparisons: AssignmentComparison[] }> =>
              result.status === 'fulfilled'
          )
          .map((result) => result.value);

        const foundAssignmentId = assignmentComparisons.find(({ comparisons }) => comparisons.some((comparison) => comparison.id === comparisonId))
          ?.assignment.id;

        const currentAssignment = assignmentComparisons.find(({ assignment }) => assignment.id === foundAssignmentId);

        const matches = (currentAssignment?.comparisons || [])
          .filter((comparison) => {
            if (comparison.id === comparisonId) return false;

            const sourceTokens = new Set<string>();
            getIdentityTokens(comparison.raw_source_id).forEach((tokenValue) => sourceTokens.add(tokenValue));
            getIdentityTokens(comparison.source_student).forEach((tokenValue) => sourceTokens.add(tokenValue));

            return Array.from(sourceTokens).some((tokenValue) => currentIds.has(tokenValue));
          })
          .map((comparison) => ({
            ...comparison,
            assignmentId: foundAssignmentId || '',
            assignmentTitle: currentAssignment?.assignment.title || '',
            course: currentAssignment?.assignment.course || '',
            isCurrentAssignment: true,
          }))
          .sort((a, b) => b.score - a.score);

        if (!cancelled) {
          setCurrentAssignmentId(foundAssignmentId || null);
          setOtherAssignmentMatches(matches);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setOtherAssignmentMatches([]);
        }
      } finally {
        if (!cancelled) {
          setOtherMatchesLoading(false);
        }
      }
    };

    fetchOtherAssignmentMatches();

    return () => {
      cancelled = true;
    };
  }, [comparisonId, data]);

  return {
    data,
    loading,
    otherAssignmentMatches,
    otherMatchesLoading,
    currentAssignmentId,
  };
};
