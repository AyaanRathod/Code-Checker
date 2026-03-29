export interface PreviewFile {
  name: string;
  size: number;
}

export interface SubmissionReceiptFile {
  name: string;
  lines: number;
  size_bytes: number;
}

export interface SubmissionSuccessData {
  submission_id?: string;
  timestamp?: string;
  attempt?: number;
  files?: SubmissionReceiptFile[];
  total_files?: number;
  total_lines?: number;
  health?: 'ok' | 'warning' | string;
  health_message?: string;
  assignment_title?: string;
  language?: string;
}

export interface StudentSubmissionFormState {
  accessKey: string;
  studentName: string;
  studentId: string;
}
