import { api } from "../api/client";
import type {
  ClassOverview,
  ClassStudent,
  ClassSummary,
  HeatmapResponse,
  OrchestratorAnswer,
  Recommendation,
  TeacherStudentProfile,
} from "../types";

export const teacherService = {
  classes(teacherId: string): Promise<ClassSummary[]> {
    return api
      .get<{ classes: ClassSummary[] }>(`/teachers/${teacherId}/classes`)
      .then((r) => r.classes ?? []);
  },

  overview(classId: string): Promise<ClassOverview> {
    return api.get<ClassOverview>(`/classes/${classId}/overview`);
  },

  heatmap(classId: string): Promise<HeatmapResponse> {
    return api.get<HeatmapResponse>(`/classes/${classId}/heatmap`);
  },

  students(classId: string): Promise<ClassStudent[]> {
    return api
      .get<{ students: ClassStudent[] }>(`/classes/${classId}/students`)
      .then((r) => r.students ?? []);
  },

  studentProfile(studentId: string): Promise<TeacherStudentProfile> {
    return api.get<TeacherStudentProfile>(`/students/${studentId}/profile`);
  },

  askOrchestrator(teacherId: string, classId: string, question: string): Promise<OrchestratorAnswer> {
    return api.post<OrchestratorAnswer>("/orchestrator/query", { teacherId, classId, question });
  },

  recommendations(classId: string, status = "pending"): Promise<Recommendation[]> {
    return api
      .get<{ recommendations: Recommendation[] }>(
        `/recommendations?classId=${encodeURIComponent(classId)}&status=${status}`,
      )
      .then((r) => r.recommendations ?? []);
  },

  approve(recommendationId: string, edits?: Record<string, unknown>) {
    return api.post<{ id: string; status: string; lessonId?: string }>(
      `/recommendations/${recommendationId}/approve`,
      edits ? { edits } : undefined,
    );
  },

  reject(recommendationId: string) {
    return api.post<{ id: string; status: string }>(`/recommendations/${recommendationId}/reject`);
  },
};
