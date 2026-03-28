export type AssignmentStatus = 'Open' | 'Closed' | 'Archived';

export type AssignmentLanguage = 'JAVA' | 'CPP' | 'C';

export type AssignmentFilter = 'All' | 'Open' | 'Closed' | 'High Risk';

export interface Assignment {
  id: string;
  title: string;
  course: string;
  language: AssignmentLanguage;
  deadline: string;
  status: AssignmentStatus;
  access_key: string;
  count: number;
  flags: number;
}

export interface Repository {
  id: string;
  name: string;
  language: AssignmentLanguage;
  created_at?: string;
  submission_count: number;
  source_assignment_id?: string | null;
}

export interface AssignmentFormState {
  title: string;
  course_code: string;
  language: AssignmentLanguage;
  deadline: string;
}

export interface DashboardStats {
  activeCount: number;
  totalSubmissions: number;
  totalRiskFlags: number;
  repoCount: number;
}
