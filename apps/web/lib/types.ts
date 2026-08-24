/**
 * Types mirror docs/api-contract.md (v2) exactly.
 * Field names must never diverge from the backend contract.
 */

export type Role = "STUDENT" | "TEACHER" | "ADMIN";
export type Difficulty = "easy" | "medium" | "hard";
export type Trend = "improving" | "stable" | "declining";
export type MistakeType = "CALCULATION_ERROR" | "CONCEPTUAL_ERROR" | "READING_ERROR";
export type HeatStatus = "GREEN" | "YELLOW" | "RED";
export type SessionKind = "STUDENT_CHAT" | "DIAGNOSTIC" | "FEEDBACK" | "ORCHESTRATOR";
export type UiLanguage = "ru" | "en" | "kk";

/* ---------------- Auth ---------------- */

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface StudentRef {
  id: string;
  grade: number;
  classId: string | null;
  goals?: Goal[];
  preferences?: StudentPreferences | null;
}

export interface TeacherRef {
  id: string;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  student?: StudentRef;
  teacher?: TeacherRef;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Extract<Role, "STUDENT" | "TEACHER">;
  grade?: number;
  phone?: string;
}

/* ---------------- Students ---------------- */

export interface Goal {
  subject?: string;
  target: string;
  deadline?: string;
  priority?: number;
}

export interface StudentPreferences {
  /** UI + content language chosen at onboarding. */
  language?: UiLanguage;
  explanationStyle?: string;
  weakTopics?: string[];
  /** Learning content language, kept separable from UI language. */
  contentLanguage?: UiLanguage;
  subjects?: string[];
}

export interface StudentProfile {
  id: string;
  userId: string;
  grade: number;
  classId: string | null;
  goals: Goal[];
  preferences: StudentPreferences | null;
  createdAt: string;
}

export interface SubjectSummary {
  id: string;
  name: string;
  avgMastery: number;
  topicCount: number;
  topicsCompleted: number;
}

export interface KnowledgeTopic {
  topicId: string;
  topicName: string;
  mastery: number;
  attempts: number;
  correctAttempts: number;
  trend: Trend;
  prerequisiteMet: boolean;
  lastActivity: string | null;
}

export interface RoadmapCurrent {
  topicId: string;
  topicName: string;
  reason: string;
}

export interface RoadmapNext {
  topicId: string;
  topicName: string;
  prerequisiteMet: boolean;
  blockedBy?: string[];
}

export interface RoadmapGoal {
  target: string;
  deadline?: string;
  progress: number;
}

export interface Roadmap {
  completed: string[];
  current: RoadmapCurrent | null;
  next: RoadmapNext[];
  goals: RoadmapGoal[];
}

/* ---------------- Topics & tasks ---------------- */

export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  parentTopicId: string | null;
  prerequisites: string[];
}

export interface Task {
  id: string;
  topicId: string;
  difficulty: Difficulty;
  content: string;
  source?: string;
}

/* ---------------- Attempts ---------------- */

export interface UpdatedMastery {
  topicId: string;
  masteryBefore: number;
  masteryAfter: number;
  attempts: number;
  correctAttempts: number;
}

export interface AttemptResult {
  correct: boolean;
  feedback: string;
  mistakeType: MistakeType | null;
  updatedMastery: UpdatedMastery;
  nextTaskDifficulty: Difficulty;
  /** Newly unlocked topics as returned by the backend: { topicId, topicName }. */
  prerequisiteUnlocked: Array<{ topicId: string; topicName: string }>;
}

/* ---------------- Diagnostic ---------------- */

export interface DiagnosticAnswer {
  topicId: string;
  answer: string;
  correct: boolean;
  attemptNumber: number;
}

export interface DiagnosticResult {
  knowledgeState: Array<{
    topicId: string;
    topicName: string;
    mastery: number;
    prerequisiteMet: boolean;
  }>;
  detectedGoals: Goal[];
  recommendedStartTopic: string;
}

/* ---------------- AI sessions ---------------- */

export type AiScenario = "chat" | "diagnostic" | "feedback" | "orchestrator/chat";

export interface AiSession {
  sessionId: string;
  kind: SessionKind;
  createdAt: string;
}

export type AiWidgetType =
  | "QUIZ"
  | "MATH_EXPRESSION"
  | "FORMULA_CARD"
  | "STEP_BY_STEP"
  | "CONFIRM";

export interface AiWidget {
  type: AiWidgetType;
  payload: Record<string, unknown>;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  widgets: AiWidget[];
  streaming?: boolean;
}

/* ---------------- Teacher ---------------- */

export interface ClassSummary {
  id: string;
  name: string;
  grade: number;
  studentCount: number;
  code: string;
}

export interface ClassOverview {
  classMastery: number;
  strongTopics: Array<{ topicId: string; topicName: string; mastery: number }>;
  weakTopics: Array<{ topicId: string; topicName: string; mastery: number }>;
  studentsNeedingRemediation: number;
}

export interface HeatmapResponse {
  topics: Array<{ id: string; name: string }>;
  students: Array<{
    studentId: string;
    studentName: string;
    topics: Array<{ topicId: string; mastery: number; status: HeatStatus }>;
  }>;
}

export interface ClassStudent {
  id: string;
  name: string;
  mastery: number;
  trend: Trend;
  lastActive: string | null;
}

export interface TeacherStudentProfile {
  id: string;
  name: string;
  overallMastery: number;
  strongTopics: string[];
  weakTopics: string[];
  recentMistakes: Array<{ topicId: string; type: MistakeType; count: number }>;
}

export interface OrchestratorAnswer {
  answer: string;
  reasoning: string[];
  suggestedRecommendationId: string | null;
}

export interface Recommendation {
  id: string;
  type: "LESSON_PLAN" | "REMEDIAL_TASK" | "STUDENT_ALERT";
  recommendation: Record<string, unknown>;
  reasoning: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

/* ---------------- Teacher: classes, lessons, assignments, content ---------------- */

export interface PlanJson {
  objectives: string[];
  warmup: string;
  explanation: string;
  practice: string[];
  differentiatedTasks: { weak: string[]; strong: string[] };
  assessment: string;
  homework: string;
}

export interface LessonSummary {
  id: string;
  classId: string;
  topicId?: string | null;
  topicName?: string;
  date: string;
  taskCount?: number;
  feedbackCount?: number;
}

export interface LessonDetail extends LessonSummary {
  planJson: PlanJson;
  assignments?: Array<{
    id: string;
    mode: "ONLINE" | "OFFLINE";
    status?: string;
    students?: Array<{ id: string; name: string; status: string; comment?: string | null }>;
  }>;
}

export interface CreateLessonPayload {
  date: string;
  topicId: string;
  planJson: PlanJson;
}

export interface LessonFeedbackItem {
  id: string;
  authorName?: string;
  rating: number;
  commentOrAudioUrl?: string | null;
  createdAt: string;
}

export interface CreateAssignmentPayload {
  topicId: string;
  mode: "ONLINE" | "OFFLINE";
  isUnique: boolean;
  targetIds?: string[];
  taskIds?: string[];
  dueDate?: string;
}

export interface AssignmentDetail {
  id: string;
  topicId: string;
  topicName?: string;
  mode: "ONLINE" | "OFFLINE";
  dueDate?: string | null;
  tasks?: Task[];
  studentAssignments?: Array<{
    id: string;
    studentId: string;
    studentName?: string;
    status: string;
    comment?: string | null;
  }>;
}

/* ---------------- Voice feedback ---------------- */

export type VoiceStatus = "processing" | "done" | "failed";

export interface VoiceFeedbackResult {
  feedbackId: string;
  status: VoiceStatus;
  transcript?: string;
  analysis?: {
    understood: string[];
    confused: string[];
    confidence: number;
    recommendedAction?: { type: string; topicId?: string };
  };
}

/* ---------------- Notifications (SSE) ---------------- */

export type NotificationEvent =
  | { type: "ASSIGNMENT_REVISION_REQUIRED"; payload: { studentAssignmentId: string; comment: string } }
  | { type: string; payload: Record<string, unknown> };

/* ---------------- Auth extras ---------------- */

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
}
