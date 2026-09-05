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
export function parseSegments(reply: string, maxWidgets = MAX_WIDGETS_PER_MESSAGE): AiSegment[] {
  const cleaned = extractJsonObject(reply);
  if (cleaned === null) {
    return [plainText(reply)];
  }

  try {
    const parsed = parseWithRepair(cleaned) as { segments?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.segments)) {
      const recovered = recoverTextFromBrokenSegmentsJson(cleaned);
      return [plainText(recovered ?? reply)];
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
        if (widgetCount >= maxWidgets) {
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
    // The model sometimes emits LaTeX inside the JSON with backslashes that
    // aren't valid JSON escapes (e.g. `\(a\)` or a stray `\$$`), which makes
    // JSON.parse throw on an otherwise well-formed { segments: [...] } blob.
    // Recovering the widgets themselves isn't reliable at that point, but the
    // "text" field values can still be pulled out with a regex — far better
    // than showing the student the raw, half-escaped JSON as if it were prose.
    const recovered = recoverTextFromBrokenSegmentsJson(cleaned);
    return [plainText(recovered ?? reply)];
  }
}

/**
 * Parses a segments JSON candidate, retrying once with a narrow repair if the
 * first attempt fails: models occasionally write a stray backslash before a
 * `$`/`$$` math delimiter (e.g. `\$$x = 1$$`) instead of a plain `$$x = 1$$`,
 * which is not a valid JSON escape and makes the whole object unparsable.
 * Dropping that specific errant backslash recovers the full structure
 * (text AND widgets), rather than only the text (see recoverTextFromBrokenSegmentsJson below).
 */
function parseWithRepair(candidate: string): unknown | null {
  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(candidate.replace(/\\(\$+)/g, '$1'));
    } catch {
      return null;
    }
  }
}

/** Best-effort recovery of `"text": "..."` values from JSON that failed to parse. */
function recoverTextFromBrokenSegmentsJson(candidate: string): string | null {
  const matches = [...candidate.matchAll(/"kind"\s*:\s*"text"\s*,\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"|"text"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"kind"\s*:\s*"text"/g)];
  if (!matches.length) {
    return null;
  }
  return matches
    .map((match) => unescapeJsonStringBestEffort(match[1] ?? match[2] ?? ''))
    .filter((text) => text.trim())
    .join('\n\n');
}

/** Unescapes the JSON escapes a model reliably gets right, leaving anything else (e.g. stray `\(`) as literal text. */
function unescapeJsonStringBestEffort(value: string): string {
  return value.replace(/\\(["\\/bfnrt])/g, (_match, char: string) => {
    switch (char) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      default:
        return char;
    }
  });
}

/**
 * Locates the `{"segments": [...]}` JSON object in a reply.
 *
 * Does NOT naively scan from the first `{` to the last `}` in the whole
 * reply: a model that (incorrectly) writes prose before the JSON often
 * includes LaTeX like `\frac{a}{b}` in that prose, whose braces would
 * otherwise get swallowed into the "JSON" slice and break parsing — which
 * then falls back to showing the *entire* raw reply (prose + literal JSON)
 * to the student. Instead:
 *   1. Prefer a ```json fenced block if present.
 *   2. Else accept the reply only if it IS a JSON object as a whole.
 *   3. Else anchor on the last `{"segments":` marker and take everything
 *      from there to the reply's last `}` — this recovers cleanly when a
 *      model prepends narrative prose before a trailing raw JSON payload.
 */
function extractJsonObject(reply: string): string | null {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    const candidate = fenced[1].trim();
    if (candidate.startsWith('{') && candidate.endsWith('}')) {
      return candidate;
    }
  }

  const trimmed = reply.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const markers = [...reply.matchAll(/\{\s*"segments"\s*:/g)];
  const lastMarker = markers[markers.length - 1];
  if (lastMarker?.index !== undefined) {
    const candidate = reply.slice(lastMarker.index);
    const end = candidate.lastIndexOf('}');
    if (end > 0) {
      return candidate.slice(0, end + 1);
    }
  }

  return null;
}

function plainText(reply: string): AiSegment {
  return { kind: 'text', text: reply };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
