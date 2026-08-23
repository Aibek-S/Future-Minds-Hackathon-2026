import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AiWidget } from './widgets/ai-widgets.registry';

export type AiTask = 'chat' | 'chat_with_profile';

export interface AiGenerateOptions {
  task: AiTask;
  messages: ChatCompletionMessageParam[];
  tools?: unknown[];
  stream?: boolean;
  /** Resolved from the authenticated user; used to scope tool execution. */
  studentId?: string;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
}

export interface AiResult {
  text: string;
  usage: AiUsage;
}

export interface AiTextChunk {
  type: 'text';
  text: string;
}

export interface AiToolCallsChunk {
  type: 'toolCalls';
  toolCalls: unknown[];
}

export interface AiWidgetChunk {
  type: 'widget';
  widget: AiWidget;
}

export interface AiDoneChunk {
  type: 'done';
  usage: AiUsage;
}

export type AiStreamChunk = AiTextChunk | AiToolCallsChunk | AiWidgetChunk | AiDoneChunk;

export type AiStream = AsyncIterable<AiStreamChunk>;
