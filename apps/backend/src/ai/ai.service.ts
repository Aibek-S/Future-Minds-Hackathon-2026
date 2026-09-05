import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ConfigService } from '@nestjs/config';
import { AiContextService } from './ai.context';
import { AiMockProvider } from './ai.mock';
import { AiProvider, AiProviderChunk, AiProviderResponse } from './ai.provider';
import { AiRetryService } from './ai.retry';
import { AiRouterService } from './ai.router';
import { AiToolsService } from './tools/ai-tools.service';
import { AiGenerateOptions, AiResult, AiStream, AiStreamChunk } from './ai.types';
import { AI_ENV, DEFAULTS } from './ai.constants';
import { getTaskConfig } from './tasks';
import { parseSegments } from './widgets/ai-segments';
import { MAX_WIDGETS_PER_MESSAGE } from './widgets/ai-widgets.registry';

interface ChainEntry {
  provider: AiProvider;
  maxRetries: number;
}

interface ToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

const MAX_TOOL_ITERATIONS = 3;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly router: AiRouterService,
    private readonly retry: AiRetryService,
    private readonly context: AiContextService,
    private readonly mock: AiMockProvider,
    private readonly config: ConfigService,
    private readonly tools: AiToolsService,
  ) {}

  /** Non-streaming generation: runs the tool loop, returns final answer + usage. */
  async generate(options: AiGenerateOptions): Promise<AiResult> {
    const { messages, tools, studentId, classId } = this.prepare(options);
    const chain = this.router.buildChain();

    if (chain.length === 0) {
      const response = await this.mock.chat({ messages, stream: false });
      return this.toResult(response.text, response.inputTokens, response.outputTokens, 'mock', 'mock');
    }

    const response = await this.runWithTools(chain, messages, tools, { studentId, classId }, false);
    return this.toResult(response.text, response.inputTokens, response.outputTokens, this.lastModel, this.lastKind);
  }

  /**
   * Streaming generation: streams final text, executes tools transparently.
   *
   * Both the plain-text and widget-bearing (buffered) paths share one
   * producer/queue so a `tool` chunk can reach the client the instant a
   * function-calling tool starts running — regardless of whether the final
   * answer itself streams token-by-token or arrives as one buffered blob
   * (widget replies must be buffered so `{ segments: [...] }` can be parsed
   * as a whole before splitting it into ordered text/widget chunks).
   */
  async *generateStream(options: AiGenerateOptions): AiStream {
    const { messages, tools, studentId, classId } = this.prepare(options);
    const chain = this.router.buildChain();

    if (chain.length === 0) {
      yield* this.mockStream(messages);
      return;
    }

    const taskConfig = getTaskConfig(options.task);
    const wantsSegments = taskConfig.widgets;
    const widgetLimit = options.widgetLimit ?? MAX_WIDGETS_PER_MESSAGE;

    const queue: AiStreamChunk[] = [];
    const waiters: Array<() => void> = [];
    let finished = false;
    let failed: Error | null = null;

    const push = (chunk: AiStreamChunk) => {
      queue.push(chunk);
      waiters.shift()?.();
    };

    const waitForChunk = () =>
      new Promise<void>((resolve) => {
        waiters.push(resolve);
      });

    const onToolCall = (tool: string) => push({ type: 'tool', tool });

    const producer = (async () => {
      try {
        const response = await this.runWithTools(
          chain,
          messages,
          tools,
          { studentId, classId },
          !wantsSegments,
          wantsSegments
            ? undefined
            : (chunk) => {
                if (chunk.type === 'text' && chunk.text) {
                  push({ type: 'text', text: chunk.text });
                }
              },
          onToolCall,
        );

        if (wantsSegments) {
          // Widget-bearing reply: the full model text is already buffered
          // (tools executed server-side above); parse { segments: [...] }
          // and emit text/widget chunks in strict order.
          const segments = parseSegments(response.text, widgetLimit);
          for (const segment of segments) {
            if (segment.kind === 'text') {
              push({ type: 'text', text: segment.text });
            } else {
              push({ type: 'widget', widget: segment.widget });
            }
          }
        }

        push({
          type: 'done',
          usage: {
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            model: this.lastModel,
            provider: this.lastKind,
          },
        });
      } catch (error) {
        failed = error instanceof Error ? error : new Error(String(error));
      } finally {
        finished = true;
        waiters.shift()?.();
      }
    })();

    while (!finished || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift() as AiStreamChunk;
        continue;
      }
      await waitForChunk();
    }

    await producer;
    if (failed) {
      throw failed;
    }
  }

  /**
   * Runs the provider chain, and if the model requests tool calls, executes
   * them (scoped to the authenticated user/student/class) and feeds the
   * results back into the conversation until a final text answer appears.
   */
  private async runWithTools(
    chain: ChainEntry[],
    initialMessages: ChatCompletionMessageParam[],
    tools: unknown[],
    context: { studentId?: string; classId?: string; userId?: string },
    stream: boolean,
    onChunk?: (chunk: AiProviderChunk) => void,
    onToolCall?: (tool: string) => void,
  ): Promise<AiProviderResponse> {
    if (!tools.length || !context.studentId && !context.classId) {
      return this.runChain(chain, initialMessages, tools, stream, onChunk);
    }

    let messages = initialMessages;
    let aggregated: AiProviderResponse | null = null;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
      const response = await this.runChain(chain, messages, tools, stream, onChunk);
      aggregated = response;
      const calls = this.normalizeToolCalls(response.toolCalls);

      if (!calls.length) {
        return response;
      }

      const toolMessages = await this.executeToolCalls(calls, context, onToolCall);
      messages = [...messages, ...toolMessages];
    }

    // The model kept requesting tools instead of producing a final answer.
    // Retry once WITHOUT tools so it is forced to reply with text.
    this.logger.warn(`Tool loop reached ${MAX_TOOL_ITERATIONS} iterations; forcing a plain-text retry`);
    const plainResponse = await this.runChain(chain, messages, [], stream, onChunk);
    if (plainResponse.text.trim() || !aggregated) {
      return plainResponse;
    }
    return aggregated;
  }

  private async executeToolCalls(
    calls: ToolCall[],
    context: { studentId?: string; classId?: string; userId?: string },
    onToolCall?: (tool: string) => void,
  ): Promise<ChatCompletionMessageParam[]> {
    const messages: ChatCompletionMessageParam[] = [];
    for (const call of calls) {
      const name = call.function?.name ?? 'unknown';
      onToolCall?.(name);
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(call.function?.arguments ?? '{}');
      } catch {
        parsed = {};
      }
      let result: string;
      try {
        result = await this.tools.execute(name, parsed, context);
      } catch (error) {
        result = JSON.stringify({ error: error instanceof Error ? error.message : 'Tool failed' });
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id ?? '',
        content: result,
      });
    }
    return messages;
  }

  private normalizeToolCalls(toolCalls: unknown): ToolCall[] {
    if (!Array.isArray(toolCalls)) {
      return [];
    }
    return toolCalls as ToolCall[];
  }

  private prepare(options: AiGenerateOptions) {
    const system: ChatCompletionMessageParam = { role: 'system', content: this.systemPrompt(options.task) };
    const budget = this.maxContextTokens();
    const { messages: trimmed } = this.context.fitBudget(options.messages, budget);
    return {
      messages: [system, ...trimmed],
      tools: options.tools ?? [],
      studentId: options.studentId,
      classId: options.classId,
    };
  }

  private systemPrompt(task: AiGenerateOptions['task']): string {
    return getTaskConfig(task).prompt;
  }

  private maxContextTokens(): number {
    const value = this.config.get<string>(AI_ENV.maxContextTokens);
    const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULTS.maxContextTokens;
  }

  private lastModel = '';
  private lastKind = '';

  private async runChain(
    chain: ChainEntry[],
    initialMessages: ChatCompletionMessageParam[],
    tools: unknown[],
    stream: boolean,
    onChunk?: (chunk: AiProviderChunk) => void,
  ): Promise<AiProviderResponse> {
    let messages = initialMessages;
    const errors: string[] = [];
    let providerIndex = 0;

    for (const entry of chain) {
      // Small pause before switching providers so free-tier rate limits
      // are not hammered at the same instant.
      if (providerIndex > 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      providerIndex += 1;

      for (let attempt = 1; attempt <= entry.maxRetries + 1; attempt += 1) {
        try {
          const response = await entry.provider.chat({
            messages,
            tools,
            stream,
            timeoutMs: this.router.timeoutMs(),
            onChunk,
          });
          this.lastModel = entry.provider.model;
          this.lastKind = entry.provider.kind;
          return response;
        } catch (error) {
          const label = `${entry.provider.kind}/${entry.provider.model}`;
          const detail = this.errorDetail(error);

          if (this.isContextOverflow(error)) {
            const trimmed = this.context.fitBudget(
              messages.filter((message) => message.role !== 'system'),
              Math.floor(this.maxContextTokens() / 2),
            );
            const system = messages.find((message) => message.role === 'system');
            messages = [system, ...trimmed.messages].filter(Boolean) as ChatCompletionMessageParam[];
            this.logger.warn(`Context overflow on ${label}: trimmed to ${messages.length} messages, retrying`);
            errors.push(`${label}: context overflow (trimmed)`);
            attempt -= 1;
            continue;
          }

          const decision = this.retry.decide(error, attempt, {
            maxRetries: entry.maxRetries,
            timeoutMs: this.router.timeoutMs(),
          });
          errors.push(`${label}: ${decision.reason ?? 'error'} (${detail})`);

          if (decision.retry) {
            this.logger.warn(`Retry ${attempt}/${entry.maxRetries + 1} on ${label}: ${decision.reason} (${detail})`);
            await this.retry.wait(decision.delayMs ?? 500);
            continue;
          }

          this.logger.warn(`Skipping ${label}: ${decision.reason} (${detail})`);
          break;
        }
      }
    }

    this.logger.error(`All AI providers failed: ${errors.join(' | ')}`);
    throw new ServiceUnavailableException(
      'Сервис ИИ сейчас недоступен. Попробуйте ещё раз через минуту.',
    );
  }

  private errorDetail(error: unknown): string {
    const anyError = error as {
      message?: string;
      status?: number;
      code?: string;
      name?: string;
    };
    const status = anyError.status !== undefined ? `status=${anyError.status}` : '';
    const code = anyError.code ? `code=${anyError.code}` : '';
    const message = anyError.message ? anyError.message.slice(0, 160) : '';
    return [status, code, message].filter(Boolean).join(' ');
  }

  private async *mockStream(messages: ChatCompletionMessageParam[]): AiStream {
    const response = await this.mock.chat({ messages, stream: false });
    const words = response.text.split(' ');
    for (const word of words) {
      yield { type: 'text', text: `${word} ` };
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    yield {
      type: 'done',
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        model: 'mock',
        provider: 'mock',
      },
    };
  }

  private toResult(
    text: string,
    inputTokens: number,
    outputTokens: number,
    model: string,
    provider: string,
  ): AiResult {
    return { text, usage: { inputTokens, outputTokens, model, provider } };
  }

  private isContextOverflow(error: unknown): boolean {
    const anyError = error as { message?: string };
    return /context_length|maximum context|token limit|too many tokens/i.test(anyError?.message ?? '');
  }
}
