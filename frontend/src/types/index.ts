export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
  department?: string;
  section?: string;
  year?: number;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  language?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  marks: number;
  timeLimitMinutes?: number;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  active?: boolean;
}

export interface AssignedQuestionItem {
  questionId: string;
  order: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  category: string;
  isSubmitted: boolean;
  isEvaluated: boolean;
  marksObtained: number | null;
  feedback: string | null;
  submissionStatus: 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'EVALUATED' | 'REJECTED';
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  rollNumber: string;
  name: string;
  department: string;
  section: string;
  totalMarks: number;
  maxPossibleMarks: number;
  percentage: number;
  completedQuestions: number;
  totalAssignedQuestions: number;
  lastEvaluationTime: string | null;
  hasSubmission?: boolean;
}

export interface SubmissionItem {
  id: string;
  assessmentId: string;
  student: {
    _id: string;
    name: string;
    studentId?: string;
    email: string;
    department?: string;
    section?: string;
  };
  question: {
    _id: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    marks: number;
    category: string;
  };
  screenshotUrl: string;
  codeSnippet?: string;
  submittedAt: string;
  attemptNumber: number;
  isEvaluated: boolean;
  evaluation?: {
    id: string;
    marksObtained: number;
    maximumMarks: number;
    feedback: string;
    evaluatedAt: string;
  } | null;
}

export interface DashboardStats {
  totalStudents: number;
  totalQuestions: number;
  totalSubmissions: number;
  evaluatedCount: number;
  pendingEvaluations: number;
  highestScore: number;
  averageScore: number;
  assessmentStatus: string;
  assessmentTitle: string;
}

export interface AuditLogItem {
  _id: string;
  adminId: {
    _id: string;
    name: string;
    email: string;
  };
  action: string;
  studentId?: {
    _id: string;
    name: string;
    studentId?: string;
  };
  questionId?: {
    _id: string;
    title: string;
    marks: number;
  };
  oldMarks?: number;
  newMarks?: number;
  details?: string;
  timestamp: string;
}
