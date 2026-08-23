import { Injectable } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AiTiktokenService } from './ai.tiktoken';

const RESERVE_RATIO = 0.85;
const MIN_KEEP_MESSAGES = 4;

/**
 * Preventive context trimming: if the message history exceeds the
 * token budget, drop the oldest non-system messages. Always keeps
 * the system prompt and the latest messages (including the current
 * user question).
 */
@Injectable()
export class AiContextService {
  constructor(private readonly tiktoken: AiTiktokenService) {}

  fitBudget(
    messages: ChatCompletionMessageParam[],
    maxContextTokens: number,
    reserveOutputTokens = 2000,
  ): { messages: ChatCompletionMessageParam[]; trimmed: number } {
    const budget = Math.floor(maxContextTokens * RESERVE_RATIO) - reserveOutputTokens;
    if (this.tiktoken.countMessages(messages) <= budget) {
      return { messages, trimmed: 0 };
    }

    const system = messages.filter((message) => message.role === 'system');
    const rest = messages.filter((message) => message.role !== 'system');

    let kept = rest.length;
    while (kept > MIN_KEEP_MESSAGES) {
      const candidate = [...system, ...rest.slice(rest.length - kept)];
      if (this.tiktoken.countMessages(candidate) <= budget) {
        break;
      }
      kept -= 2;
    }

    const result = [...system, ...rest.slice(rest.length - kept)];
    return { messages: result, trimmed: rest.length - kept };
  }
}
