import { Injectable } from '@nestjs/common';
import { encodingForModel, getEncoding, Tiktoken } from 'js-tiktoken';

/**
 * Token counting for context management. Uses cl100k_base encoding
 * (matches the DeepSeek / GPT / OpenRouter model families closely
 * enough for truncation decisions; not an exact billing counter).
 */
@Injectable()
export class AiTiktokenService {
  private readonly encoder: Tiktoken;

  constructor() {
    try {
      this.encoder = encodingForModel('gpt-4o');
    } catch {
      this.encoder = getEncoding('cl100k_base');
    }
  }

  countTokens(text: string): number {
    return this.encoder.encode(text).length;
  }

  countMessages(messages: { role: string; content?: unknown }[]): number {
    let total = 0;
    for (const message of messages) {
      total += 4; // message overhead approximation
      if (typeof message.content === 'string') {
        total += this.countTokens(message.content);
      }
    }
    total += 2; // assistant priming
    return total;
  }
}
