import apiClient from '../lib/apiClient';
import type { Assignment, AssignmentFormState, Repository } from '../types/dashboard';

const buildAuthHeaders = (token: string, isMultipart = false) => ({
  Authorization: `Bearer ${token}`,
  ...(isMultipart ? { 'Content-Type': 'multipart/form-data' } : {}),
});

export const fetchAssignmentsApi = async (token: string): Promise<Assignment[]> => {
  const response = await apiClient.get('/instructor/assignments', {
    headers: buildAuthHeaders(token),
  });

  return response.data;
};

export const archiveAssignmentApi = async (token: string, assignmentId: string): Promise<void> => {
  await apiClient.post(
    `/instructor/assignments/${assignmentId}/archive`,
    {},
    { headers: buildAuthHeaders(token) }
  );
};

export const createAssignmentApi = async (
  token: string,
  payload: AssignmentFormState,
  boilerplateFile: File | null
): Promise<void> => {
  const formData = new FormData();
  formData.append('course_code', payload.course_code);
  formData.append('title', payload.title);
  formData.append('language', payload.language);
  formData.append('deadline', payload.deadline);

  if (boilerplateFile) {
    formData.append('boilerplate_file', boilerplateFile);
  }

  await apiClient.post('/instructor/assignments', formData, {
    headers: buildAuthHeaders(token, true),
  });
};

export const updateAssignmentApi = async (
  token: string,
  assignmentId: string,
  payload: AssignmentFormState,
  boilerplateFile: File | null
): Promise<void> => {
  const formData = new FormData();
  formData.append('course_code', payload.course_code);
  formData.append('title', payload.title);
  formData.append('language', payload.language);
  formData.append('deadline', payload.deadline);

  if (boilerplateFile) {
    formData.append('boilerplate_file', boilerplateFile);
  }

  await apiClient.patch(`/instructor/assignments/${assignmentId}`, formData, {
    headers: buildAuthHeaders(token, true),
  });
};

export const fetchRepositoriesApi = async (token: string): Promise<Repository[]> => {
  const response = await apiClient.get('/repositories/', {
    headers: buildAuthHeaders(token),
  });

  return response.data;
};

export const uploadRepositoryApi = async (
  token: string,
  payload: { name: string; language: string; file: File }
): Promise<void> => {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('language', payload.language);
  formData.append('file', payload.file);

  await apiClient.post('/repositories/upload', formData, {
    headers: buildAuthHeaders(token, true),
  });
};

export const deleteRepositoryApi = async (token: string, repoId: string): Promise<void> => {
  await apiClient.delete(`/repositories/${repoId}`, {
    headers: buildAuthHeaders(token),
  });
};
