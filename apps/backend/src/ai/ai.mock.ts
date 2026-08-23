import { Injectable } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AiProviderChunk, AiProviderResponse } from './ai.provider';

const MOCK_RESPONSE = [
  'Привет! Я твой ИИ-репетитор. Я сейчас работаю в mock-режиме (без реального LLM-провайдера).',
  'Задай вопрос по алгебре или геометрии — а когда подключим API-ключ, я отвечу по-настоящему.',
].join(' ');

/**
 * Deterministic mock provider used when no API key is configured
 * (AI_PROVIDER=mock). Streams the canned response in small chunks
 * so the SSE path is exercised end to end.
 */
@Injectable()
export class AiMockProvider {
  async chat(options: {
    messages: ChatCompletionMessageParam[];
    stream?: boolean;
    onChunk?: (chunk: AiProviderChunk) => void;
  }): Promise<AiProviderResponse> {
    const inputTokens = Math.ceil(
      options.messages.reduce((sum, message) => sum + (typeof message.content === 'string' ? message.content.length : 0), 0) / 3.5,
    );

    if (options.stream) {
      const words = MOCK_RESPONSE.split(' ');
      for (const word of words) {
        const chunkText = `${word} `;
        options.onChunk?.({ type: 'text', text: chunkText });
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    }

    return {
      text: MOCK_RESPONSE,
      inputTokens,
      outputTokens: Math.ceil(MOCK_RESPONSE.length / 3.5),
    };
  }
}
