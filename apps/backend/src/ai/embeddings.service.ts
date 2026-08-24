import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export const EMBEDDING_DIMENSIONS = 1536;

export async function embedText(input: string, options: { apiKey: string; model: string; dimensions?: number }) {
  if (!input.trim()) throw new Error('Embedding input must not be empty');
  const dimensions = options.dimensions ?? EMBEDDING_DIMENSIONS;
  if (dimensions !== EMBEDDING_DIMENSIONS) throw new Error(`MaterialVector requires ${EMBEDDING_DIMENSIONS} dimensions`);
  const client = new OpenAI({ apiKey: options.apiKey, maxRetries: 2 });
  const response = await client.embeddings.create({ model: options.model, input, dimensions });
  const embedding = response.data[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) throw new Error('Embedding provider returned an invalid vector');
  return embedding;
}

@Injectable()
export class EmbeddingsService {
  constructor(private readonly config: ConfigService) {}

  async embed(input: string) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('OPENAI_API_KEY is required for embeddings');
    try {
      return await embedText(input, {
        apiKey,
        model: this.config.get<string>('EMBEDDING_MODEL') ?? 'text-embedding-3-small',
        dimensions: Number(this.config.get<string>('EMBEDDING_DIMENSIONS') ?? EMBEDDING_DIMENSIONS),
      });
    } catch (error) {
      throw new ServiceUnavailableException(error instanceof Error ? error.message : 'Embedding generation failed');
    }
  }
}
