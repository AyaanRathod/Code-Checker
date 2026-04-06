import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useFileDrop } from './useFileDrop';
import {
  ACCEPTED_UPLOAD,
  extractPreviewFilesFromUpload,
  formatTorontoTimestamp,
} from '../components/student-portal/studentPortalUtils';
import { buildSubmissionReceiptPdf } from '../components/student-portal/submissionReceiptPdf';
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
  const [assignmentInfo, setAssignmentInfo] = useState<{ title: string; deadline: string; language: string } | null>(null);

  // Debounce-fetch assignment info when the access key field changes so students
  // can see the assignment title and deadline before submitting.
  useEffect(() => {
    const key = formState.accessKey.trim();
    if (!key) {
      setAssignmentInfo(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/student/assignment-info?access_key=${encodeURIComponent(key)}`);
        setAssignmentInfo(res.data);
      } catch {
        setAssignmentInfo(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formState.accessKey]);

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
    setAssignmentInfo(null);
    clearFile();
  }, [clearFile]);

  const saveReceipt = useCallback(() => {
    if (!successData) return;

    const doc = buildSubmissionReceiptPdf(successData);
    const receiptId = (successData.submission_id || 'unknown').slice(0, 8);
    doc.save(`receipt_${receiptId}.pdf`);
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
    assignmentInfo,
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
