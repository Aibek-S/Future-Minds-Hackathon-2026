import { api } from "../api/client";
import type {
  CreateAssignmentPayload,
  AssignmentDetail,
  CreateLessonPayload,
  LessonDetail,
  LessonFeedbackItem,
  LessonSummary,
} from "../types";

export const lessonsService = {
  create(classId: string, payload: CreateLessonPayload): Promise<LessonDetail> {
    return api.post(`/classes/${classId}/lessons`, payload);
  },

  list(classId: string, range?: { from?: string; to?: string }): Promise<LessonSummary[]> {
    const params = new URLSearchParams();
    if (range?.from) params.set("from", range.from);
    if (range?.to) params.set("to", range.to);
    const qs = params.size ? `?${params.toString()}` : "";
    return api.get<{ lessons?: LessonSummary[] } | LessonSummary[]>(`/classes/${classId}/lessons${qs}`).then((r) =>
      Array.isArray(r) ? r : (r.lessons ?? []),
    );
  },

  get(lessonId: string): Promise<LessonDetail> {
    return api.get<LessonDetail>(`/lessons/${lessonId}`);
  },

  update(lessonId: string, patch: Partial<CreateLessonPayload>): Promise<LessonDetail> {
    return api.put(`/lessons/${lessonId}`, patch);
  },

  remove(lessonId: string) {
    return api.del(`/lessons/${lessonId}`);
  },

  sendFeedback(
    lessonId: string,
    body: { rating: number; commentOrAudioUrl?: string },
  ): Promise<unknown> {
    return api.post(`/lessons/${lessonId}/feedback`, body);
  },

  feedback(lessonId: string): Promise<LessonFeedbackItem[]> {
    return api
      .get<{ feedback?: LessonFeedbackItem[] } | LessonFeedbackItem[]>(`/lessons/${lessonId}/feedback`)
      .then((r) => (Array.isArray(r) ? r : (r.feedback ?? [])));
  },
};

export const assignmentsService = {
  create(classId: string, payload: CreateAssignmentPayload): Promise<AssignmentDetail> {
    return api.post(`/classes/${classId}/assignments`, payload);
  },

  get(id: string): Promise<AssignmentDetail> {
    return api.get<AssignmentDetail>(`/assignments/${id}`);
  },

  submitOnline(id: string, answers: Array<{ taskId: string; answer: string }>) {
    return api.post<{ status: string }>(`/student-assignments/${id}/submit`, { answers });
  },

  submitOffline(id: string) {
    return api.post<{ status: string }>(`/student-assignments/${id}/submit`, { submittedInClass: true });
  },

  verify(
    id: string,
    action: "APPROVE" | "REJECT",
    comment?: string,
  ) {
    return api.post<{ status: string }>(`/student-assignments/${id}/verify`, { action, comment });
  },
};
