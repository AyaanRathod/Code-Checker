import { useCallback, useEffect, useState } from 'react';
import {
  archiveAssignmentApi,
  createAssignmentApi,
  deleteRepositoryApi,
  fetchAssignmentsApi,
  fetchRepositoriesApi,
  updateAssignmentApi,
  uploadRepositoryApi,
} from '../api/dashboardApi';
import type { Assignment, AssignmentFormState, Repository } from '../types/dashboard';

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) {
      return response.data.detail;
    }
  }
  return fallback;
};

export const useDashboardData = (navigate: (path: string) => void) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  const requireToken = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/instructor/login');
      return null;
    }
    return token;
  }, [navigate]);

  const fetchAssignments = useCallback(
    async (showLoader = false) => {
      const token = requireToken();
      if (!token) {
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      try {
        const data = await fetchAssignmentsApi(token);
        setAssignments(data);
      } finally {
        setLoading(false);
      }
    },
    [requireToken]
  );

  const fetchRepos = useCallback(async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    const data = await fetchRepositoriesApi(token);
    setRepos(data);
  }, [requireToken]);

  const saveAssignment = useCallback(
    async (payload: AssignmentFormState, boilerplateFile: File | null, editingAssignmentId?: string) => {
      const token = requireToken();
      if (!token) {
        return;
      }

      if (editingAssignmentId) {
        await updateAssignmentApi(token, editingAssignmentId, payload, boilerplateFile);
      } else {
        await createAssignmentApi(token, payload, boilerplateFile);
      }

      await fetchAssignments(true);
    },
    [fetchAssignments, requireToken]
  );

  const archiveAssignment = useCallback(
    async (assignmentId: string) => {
      const token = requireToken();
      if (!token) {
        return;
      }

      await archiveAssignmentApi(token, assignmentId);
      await fetchAssignments();
    },
    [fetchAssignments, requireToken]
  );

  const uploadRepo = useCallback(
    async (payload: {
      name: string;
      language: string;
      file: File;
      import_to_assignment?: boolean;
    }): Promise<{ imported_to_assignment_id?: string | null; imported_to_assignment_title?: string | null } | undefined> => {
      const token = requireToken();
      if (!token) {
        return;
      }

      const result = await uploadRepositoryApi(token, payload);
      await fetchRepos();
      return result;
    },
    [fetchRepos, requireToken]
  );

  const deleteRepo = useCallback(
    async (repoId: string) => {
      const token = requireToken();
      if (!token) {
        return;
      }

      await deleteRepositoryApi(token, repoId);
      setRepos((prev) => prev.filter((repo) => repo.id !== repoId));
    },
    [requireToken]
  );

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([fetchAssignments(true), fetchRepos()]);
      } catch {
        // Errors are surfaced by calling code where needed.
      }
    };

    init();
  }, [fetchAssignments, fetchRepos]);

  return {
    assignments,
    repos,
    loading,
    setLoading,
    fetchAssignments,
    fetchRepos,
    saveAssignment,
    archiveAssignment,
    uploadRepo,
    deleteRepo,
    extractErrorMessage,
  };
};
