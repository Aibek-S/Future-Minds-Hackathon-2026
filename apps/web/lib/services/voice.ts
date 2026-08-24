import { apiUrl, authHeaders, tokenStore } from "../api/client";
import type { VoiceFeedbackResult } from "../types";

export const voiceService = {
  /** POST /voice-feedback — multipart upload. */
  async upload(input: {
    studentId: string;
    targetType: "LESSON" | "TUTOR_SESSION";
    targetId: string;
    file: Blob;
    fileName?: string;
  }): Promise<{ feedbackId: string; status: string }> {
    const form = new FormData();
    form.set("studentId", input.studentId);
    form.set("targetType", input.targetType);
    form.set("targetId", input.targetId);
    form.set("audio", input.file, input.fileName ?? "note.webm");
    const res = await fetch(apiUrl("/voice-feedback"), {
      method: "POST",
      headers: authHeaders(),
      body: form,
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Voice upload failed (${res.status})`);
    return res.json();
  },

  async status(feedbackId: string): Promise<VoiceFeedbackResult> {
    const res = await fetch(apiUrl(`/voice-feedback/${feedbackId}`), {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Voice status failed (${res.status})`);
    return res.json();
  },

  /** Polls until done/failed (mock mode resolves on first call). */
  async pollUntilDone(feedbackId: string, tries = 10, delayMs = 700): Promise<VoiceFeedbackResult> {
    for (let i = 0; i < tries; i++) {
      const r = await voiceService.status(feedbackId);
      if (r.status !== "processing") return r;
      await new Promise((ok) => setTimeout(ok, delayMs));
    }
    throw new Error("Voice processing timeout");
  },
};

/** GET /notifications/stream — SSE with Bearer JWT (fetch-based). */
export function subscribeNotifications(
  handlers: {
    onEvent?: (event: { type: string; payload?: Record<string, unknown> }) => void;
    onError?: () => void;
  },
  signal?: AbortSignal,
): void {
  void (async () => {
    try {
      const token = tokenStore.access;
      if (!token) return;
      const res = await fetch(apiUrl("/notifications/stream"), {
        headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
        credentials: "include",
        ...(signal ? { signal } : {}),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try {
              const parsed = JSON.parse(line.slice(5).trim()) as { event?: string; data?: Record<string, unknown> };
              // Backend may wrap as {event,data} or flat {type,payload}
              const type = String(parsed.event ?? (parsed as { type?: string }).type ?? "");
              if (!type) continue;
              const payload =
                (parsed.data as { payload?: Record<string, unknown> })?.payload ??
                (parsed as { payload?: Record<string, unknown> }).payload ?? {};
              handlers.onEvent?.({ type, payload });
            } catch {
              /* ignore malformed frame */
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      handlers.onError?.();
    }
  })();
}
