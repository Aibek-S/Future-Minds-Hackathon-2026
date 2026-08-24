import { api } from "../api/client";
import type { AttemptResult } from "../types";

export const tasksService = {
  /** POST /tasks/:id/attempts — backend decides `correct` and updates mastery. */
  attempt(taskId: string, studentId: string, answer: string): Promise<AttemptResult> {
    return api.post<AttemptResult>(`/tasks/${taskId}/attempts`, { studentId, answer });
  },
};
