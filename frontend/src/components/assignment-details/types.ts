export type TabView = 'submissions' | 'overview' | 'results' | 'clusters';

export interface AssignmentDetailsModel {
  id: string;
  title: string;
  course: string;
  deadline: string;
  status: 'Open' | 'Closed' | 'Archived' | 'Analyzing...' | string;
}

export interface AssignmentComparisonItem {
  id: string;
  source_student: string;
  target_student: string;
  score: number;
  comparison_type?: 'internal' | 'cross_repo' | string;
}

export interface AssignmentSubmissionItem {
  id: string;
  masked_student_id: string;
  timestamp?: string;
  attempt_number: number;
  file_count: number;
  total_lines: number;
  total_bytes: number;
  status: string;
  is_flagged?: boolean;
}

export interface AssignmentRepositoryItem {
  id: string;
  name: string;
  language: string;
  submission_count: number;
}

export interface AssignmentMetrics {
  total: number;
  highRisk: number;
  reviews: number;
  avg: number;
  distribution: number[];
  maxInDist: number;
}

export interface AssignmentDetailsLocationState {
  initialTab?: TabView;
}
