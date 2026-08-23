import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export type AiProviderKind = 'deepseek' | 'openrouter' | 'mock';

export interface AiProviderConfig {
  kind: AiProviderKind;
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface AiProviderChunk {
  type: 'text' | 'toolCalls';
  text?: string;
  toolCalls?: unknown[];
}

export interface AiProviderResponse {
  text: string;
  toolCalls?: unknown[];
  inputTokens: number;
  outputTokens: number;
}

export interface AiProviderOptions {
  messages: ChatCompletionMessageParam[];
  tools?: unknown[];
  stream?: boolean;
  timeoutMs: number;
  onChunk?: (chunk: AiProviderChunk) => void;
}

/**
 * Thin wrapper around the OpenAI SDK. Both DeepSeek and OpenRouter
 * expose OpenAI-compatible endpoints, so only baseURL/key/model differ.
 */
export class AiProvider {
  private readonly client: OpenAI;

  constructor(private readonly config: AiProviderConfig) {
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      // NOTE: timeout:0 in OpenAI SDK 7.x means "time out immediately",
      // NOT "no timeout". We pass an explicit per-request timeout instead.
      timeout: 30_000,
      maxRetries: 0,
    });
  }

  get model(): string {
    return this.config.model;
  }

  get kind(): AiProviderKind {
    return this.config.kind;
  }

  async chat(options: AiProviderOptions): Promise<AiProviderResponse> {
    if (!options.stream) {
      return this.chatBlocking(options);
    }

    const stream = await this.client.chat.completions.create(
      {
        model: this.config.model,
        messages: options.messages,
        ...(options.tools?.length ? { tools: options.tools as never } : {}),
        stream: true,
        stream_options: { include_usage: true },
      },
      { timeout: options.timeoutMs },
    );

    let text = '';
    const toolCallParts = new Map<number, { id?: string; name?: string; arguments: string }>();
    let usage: { prompt_tokens?: number; completion_tokens?: number } = {};

    for await (const part of stream) {
      const choice = part.choices?.[0];
      const delta = choice?.delta;
      const chunkUsage = (part as { usage?: typeof usage }).usage;
      if (chunkUsage) {
        usage = chunkUsage;
      }
      if (delta?.content) {
        text += delta.content;
        options.onChunk?.({ type: 'text', text: delta.content });
      }
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index ?? 0;
          const existing = toolCallParts.get(index) ?? { arguments: '' };
          if (toolCall.id) existing.id = toolCall.id;
          if (toolCall.function?.name) existing.name = toolCall.function.name;
          if (toolCall.function?.arguments) existing.arguments += toolCall.function.arguments;
          toolCallParts.set(index, existing);
        }
      }
    }

    const toolCalls = [...toolCallParts.values()]
      .sort((left, right) => Number(left.id ?? 0) - Number(right.id ?? 0))
      .map((part) => ({
        id: part.id,
        function: { name: part.name ?? '', arguments: part.arguments },
      }));
    if (toolCalls.length) {
      options.onChunk?.({ type: 'toolCalls', toolCalls });
    }

    return {
      text,
      toolCalls,
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
    };
  }

  private async chatBlocking(options: AiProviderOptions): Promise<AiProviderResponse> {
    const completion = await this.client.chat.completions.create(
      {
        model: this.config.model,
        messages: options.messages,
        ...(options.tools?.length ? { tools: options.tools as never } : {}),
      },
      { timeout: options.timeoutMs },
    );

    const message = completion.choices?.[0]?.message;
    return {
      text: message?.content ?? '',
      toolCalls: message?.tool_calls ?? undefined,
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    };
  }
}
