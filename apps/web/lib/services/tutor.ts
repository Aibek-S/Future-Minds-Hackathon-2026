import { api } from "../api/client";
import { streamMessage, type StreamHandlers } from "../api/sse";
import type { AiScenario, AiSession } from "../types";

/**
 * One service for every SSE scenario of the contract:
 * /chat, /diagnostic, /feedback, /orchestrator/chat.
 */
export const tutorService = {
  createSession(scenario: AiScenario): Promise<AiSession> {
    return api.post<AiSession>(`/${scenario}/sessions`);
  },

  listSessions(scenario: AiScenario) {
    return api
      .get<{ sessions: Array<{ id: string; createdAt: string; messageCount: number }> }>(
        `/${scenario}/sessions`,
      )
      .then((r) => r.sessions ?? []);
  },

  history(scenario: AiScenario, sessionId: string) {
    return api.get<unknown>(`/${scenario}/sessions/${sessionId}/messages`);
  },

  send(
    scenario: AiScenario,
    sessionId: string,
    body: { content: string; classId?: string; context?: Record<string, unknown> },
    handlers: StreamHandlers,
    signal?: AbortSignal,
  ) {
    return streamMessage(`/${scenario}/sessions/${sessionId}/messages`, body, handlers, signal);
  },
};
