import { api } from "../api/client";
import type { ClassSummary, Difficulty, Task } from "../types";

export const classesService = {
  list(teacherId: string): Promise<ClassSummary[]> {
    return api
      .get<{ classes: ClassSummary[] }>(`/teachers/${teacherId}/classes`)
      .then((r) => r.classes ?? []);
  },

  create(teacherId: string, body: { name: string; grade: number }): Promise<ClassSummary> {
    return api.post(`/teachers/${teacherId}/classes`, body);
  },

  remove(classId: string) {
    return api.del(`/classes/${classId}`);
  },

  removeStudent(classId: string, studentId: string) {
    return api.post(`/classes/${classId}/students/${studentId}`, undefined).catch(() =>
      // DELETE verb fallback handled by api below
      null,
    );
  },
};

/** Direct DELETE calls (api.del) */
export const classMutations = {
  deleteClass: (classId: string) => api.del<{ id: string }>(`/classes/${classId}`),
  removeStudent: (classId: string, studentId: string) =>
    api.del<{ studentId: string }>(`/classes/${classId}/students/${studentId}`),
  join: (classId: string, code: string) =>
    api.post<{ classId: string; message: string }>(`/classes/${classId}/join`, { code }),
};

export const contentService = {
  /** POST /classes/:id/topics — topic scoped to a class, auto-vectorized. */
  addTopicToClass(
    classId: string,
    body: { name: string; subjectId: string; parentTopicId?: string | null },
  ) {
    return api.post<{ id?: string }>(`/classes/${classId}/topics`, body);
  },

  createTask(topicId: string, body: { difficulty: Difficulty; content: string; source?: string }) {
    return api.post<Task>(`/topics/${topicId}/tasks`, { ...body, source: body.source ?? "manual" });
  },

  updateTask(taskId: string, body: { difficulty?: Difficulty; content?: string }) {
    return api.put(`/tasks/${taskId}`, body);
  },

  deleteTask(taskId: string) {
    return api.del(`/tasks/${taskId}`);
  },

  uploadMaterial(topicId: string, body: { content: string; sourceUrl?: string }) {
    return api.post<{ materialId: string; status: string }>(`/topics/${topicId}/materials`, body);
  },
};
