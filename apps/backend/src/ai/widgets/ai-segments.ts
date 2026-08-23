import { Logger } from '@nestjs/common';
import { AiWidget, isValidWidget, MAX_WIDGETS_PER_MESSAGE } from './ai-widgets.registry';

export type AiSegment =
  | { kind: 'text'; text: string }
  | { kind: 'widget'; widget: AiWidget };

const logger = new Logger('AiSegments');

/**
 * Parses the model's reply as a JSON `{ "segments": [...] }` blob.
 * Each segment is either `{ kind: "text", text }` or
 * `{ kind: "widget", widget: { type, payload } }`.
 *
 * Robustness rules:
 * - Widgets are validated against the registry; invalid ones are dropped
 *   (text is always preserved), so a malformed widget never breaks the chat.
 * - At most MAX_WIDGETS_PER_MESSAGE widgets are kept.
 * - If the whole reply is not valid segments JSON, returns a single text
 *   segment with the raw reply (plain chat keeps working).
 */
export function parseSegments(reply: string): AiSegment[] {
  const cleaned = extractJsonObject(reply);
  if (cleaned === null) {
    return [plainText(reply)];
  }

  try {
    const parsed = JSON.parse(cleaned) as { segments?: unknown };
    if (!parsed || !Array.isArray(parsed.segments)) {
      return [plainText(reply)];
    }

    const segments: AiSegment[] = [];
    let widgetCount = 0;

    for (const item of parsed.segments) {
      if (!isRecord(item)) {
        continue;
      }
      if (item.kind === 'text' && typeof item.text === 'string') {
        if (item.text.trim()) {
          segments.push({ kind: 'text', text: item.text });
        }
        continue;
      }
      if (item.kind === 'widget' && isValidWidget(item.widget)) {
        if (widgetCount >= MAX_WIDGETS_PER_MESSAGE) {
          logger.warn('Dropping widget: max per-message reached');
          continue;
        }
        widgetCount += 1;
        segments.push({ kind: 'widget', widget: item.widget });
        continue;
      }
      logger.warn(`Dropping invalid segment: ${JSON.stringify(item).slice(0, 120)}`);
    }

    if (!segments.length) {
      return [plainText(reply)];
    }
    return segments;
  } catch {
    return [plainText(reply)];
  }
}

/** Locates the outermost JSON object in a reply (handles code fences / prose around it). */
function extractJsonObject(reply: string): string | null {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return reply.slice(start, end + 1);
}

function plainText(reply: string): AiSegment {
  return { kind: 'text', text: reply };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
