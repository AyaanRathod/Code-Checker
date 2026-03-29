export interface FileRange {
  start: number;
  end: number;
  file_index?: number;
}

export interface FileEntry {
  file_index?: number;
  filename: string;
  code: string;
  ranges: FileRange[];
}

export interface MatchPair {
  match_id: number;
  confidence?: 'high' | 'medium' | 'low';
  min_span_chars?: number;
  hash_count?: number;
  pair_count?: number;
  source: FileRange[];
  target: FileRange[];
}

export interface AssignmentSummary {
  id: string;
  title: string;
  course: string;
}

export interface AssignmentComparison {
  id: string;
  source_student: string;
  target_student: string;
  raw_source_id: string;
  raw_target_id: string;
  score: number;
  status: string;
}

export interface OtherAssignmentMatch extends AssignmentComparison {
  assignmentId: string;
  assignmentTitle: string;
  course: string;
  isCurrentAssignment: boolean;
}

export interface ComparisonData {
  score?: number;
  source_student_decrypted?: string;
  target_student_decrypted?: string;
  source_student_name?: string;
  target_student_name?: string;
  source_submission_id?: string;
  target_submission_id?: string;
  source_code?: string;
  target_code?: string;
  source_files?: FileEntry[];
  target_files?: FileEntry[];
  metadata?: {
    source_ranges?: FileRange[];
    target_ranges?: FileRange[];
    matched_pairs?: unknown[];
  };
}

export interface ParsedComparisonData {
  sourceLineMatchMap: Map<number, Set<number>>;
  targetLineMatchMap: Map<number, Set<number>>;
  sourceFirstLineByMatch: Map<number, number>;
  targetFirstLineByMatch: Map<number, number>;
  sourceMatchIds: number[];
  targetMatchIds: number[];
}

export interface LineHighlightStyle {
  bg: string;
  border: string;
  blockId: number;
  isActive: boolean;
}
