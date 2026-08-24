import { api } from "../api/client";
import type {
  DiagnosticAnswer,
  DiagnosticResult,
  KnowledgeTopic,
  Roadmap,
  StudentProfile,
  SubjectSummary,
} from "../types";

export const studentsService = {
  get(studentId: string): Promise<StudentProfile> {
    return api.get<StudentProfile>(`/students/${studentId}`);
  },

  update(studentId: string, patch: Partial<Pick<StudentProfile, "goals" | "preferences" | "grade">>) {
    return api.put<StudentProfile>(`/students/${studentId}`, patch);
  },

  subjects(studentId: string): Promise<SubjectSummary[]> {
    return api
      .get<{ subjects: SubjectSummary[] }>(`/students/${studentId}/subjects`)
      .then((r) => r.subjects ?? []);
  },

  knowledge(studentId: string, subjectId?: string): Promise<KnowledgeTopic[]> {
    const qs = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
    return api
      .get<{ topics: KnowledgeTopic[] }>(`/students/${studentId}/knowledge${qs}`)
      .then((r) => r.topics ?? []);
  },

  roadmap(studentId: string, subjectId?: string): Promise<Roadmap> {
    const qs = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
    return api.get<Roadmap>(`/students/${studentId}/roadmap${qs}`);
  },

  submitDiagnostic(studentId: string, answers: DiagnosticAnswer[]): Promise<DiagnosticResult> {
    return api.post<DiagnosticResult>(`/students/${studentId}/diagnostic`, { answers });
  },
};
