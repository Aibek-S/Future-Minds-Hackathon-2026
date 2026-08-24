import { api } from "../api/client";
import type { Difficulty, Task, Topic } from "../types";

export const topicsService = {
  list(subjectId?: string): Promise<Topic[]> {
    const qs = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
    return api.get<{ topics: Topic[] }>(`/topics${qs}`).then((r) => r.topics ?? []);
  },

  tasks(topicId: string, difficulty?: Difficulty): Promise<Task[]> {
    const qs = difficulty ? `?difficulty=${difficulty}` : "";
    return api.get<{ tasks: Task[] }>(`/topics/${topicId}/tasks${qs}`).then((r) => r.tasks ?? []);
  },
};
