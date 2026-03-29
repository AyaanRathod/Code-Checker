import { useCallback, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useFileDrop } from './useFileDrop';
import {
  ACCEPTED_UPLOAD,
  buildReceiptText,
  extractPreviewFilesFromUpload,
  formatTorontoTimestamp,
} from '../components/student-portal/studentPortalUtils';
import type {
  PreviewFile,
  StudentSubmissionFormState,
  SubmissionSuccessData,
} from '../components/student-portal/types';

export const useStudentPortalSubmission = () => {
  const [formState, setFormState] = useState<StudentSubmissionFormState>({
    accessKey: '',
    studentName: '',
    studentId: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<SubmissionSuccessData | null>(null);

  const processSelectedFile = useCallback(async (selected: File) => {
    setFile(selected);
    setPreviewFiles([]);
    const previews = await extractPreviewFilesFromUpload(selected);
    setPreviewFiles(previews);
  }, []);

  const { dragActive, dragHandlers } = useFileDrop({
    accept: ACCEPTED_UPLOAD,
    onFile: processSelectedFile,
  });

  const onFieldChange = useCallback((field: keyof StudentSubmissionFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreviewFiles([]);
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!formState.accessKey || !formState.studentName || !formState.studentId || !file) {
        setError('All fields are required.');
        return;
      }

      setLoading(true);
      setError('');

      const payload = new FormData();
      payload.append('access_key', formState.accessKey);
      payload.append('student_name', formState.studentName);
      payload.append('student_id', formState.studentId);
      payload.append('file', file);

      try {
        const response = await apiClient.post('/student/submit', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccessData(response.data as SubmissionSuccessData);
      } catch (err: unknown) {
        const message =
          typeof err === 'object' && err !== null && 'response' in err
            ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
              'Failed to submit assignment. Please try again.')
            : 'Failed to submit assignment. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [file, formState]
  );

  const submitAnother = useCallback(() => {
    setSuccessData(null);
    clearFile();
  }, [clearFile]);

  const saveReceipt = useCallback(() => {
    if (!successData) return;

    const receipt = buildReceiptText(successData);
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `receipt_${(successData.submission_id || 'unknown').slice(0, 8)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [successData]);

  const showZipNoValidFilesWarning = useMemo(
    () => !!file && file.name.endsWith('.zip') && previewFiles.length === 0,
    [file, previewFiles.length]
  );

  return {
    formState,
    file,
    previewFiles,
    loading,
    error,
    successData,
    dragActive,
    dragHandlers,
    showZipNoValidFilesWarning,
    onFieldChange,
    processSelectedFile,
    clearFile,
    submit,
    submitAnother,
    saveReceipt,
    formatTorontoTimestamp,
  };
};
