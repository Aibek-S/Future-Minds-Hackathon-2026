import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export type AiTask = 'chat';

export interface AiGenerateOptions {
  task: AiTask;
  messages: ChatCompletionMessageParam[];
  tools?: unknown[];
  stream?: boolean;
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

export interface AiDoneChunk {
  type: 'done';
  usage: AiUsage;
}

export type AiStreamChunk = AiTextChunk | AiToolCallsChunk | AiDoneChunk;

export type AiStream = AsyncIterable<AiStreamChunk>;
