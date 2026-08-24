import { apiUrl, authHeaders } from "./client";
import type { AiWidget } from "../types";

export interface StreamHandlers {
  onText?: (chunk: string) => void;
  onWidget?: (widget: AiWidget) => void;
  onDone?: (usage: unknown) => void;
  onError?: (error: Error) => void;
}

/**
 * Consumes the backend SSE stream for
 * POST /{scenario}/sessions/:id/messages.
 *
 * Events: `message` (text chunk), `widget` (structured widget), `done` (usage).
 * Uses fetch + ReadableStream because EventSource cannot send POST bodies or
 * an Authorization header.
 */
export async function streamMessage(
  path: string,
  body: Record<string, unknown>,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...authHeaders(),
      },
      body: JSON.stringify(body),
      credentials: "include",
      ...(signal ? { signal } : {}),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Stream failed with status ${res.status}`);
    }

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
        let event = "message";
        const dataLines: string[] = [];

        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length === 0) continue;

        const raw = dataLines.join("\n");
        let parsed: unknown = raw;
        try {
          parsed = JSON.parse(raw);
        } catch {
          /* plain text payload */
        }

        if (event === "message") {
          const text =
            typeof parsed === "string"
              ? parsed
              : String((parsed as { text?: string })?.text ?? "");
          if (text) handlers.onText?.(text);
        } else if (event === "widget") {
          handlers.onWidget?.(parsed as AiWidget);
        } else if (event === "done") {
          handlers.onDone?.(parsed);
        }
      }
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    handlers.onError?.(error as Error);
  }
}
