import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULTS, AI_ENV } from './ai.constants';
import { AiProvider, AiProviderConfig, AiProviderKind } from './ai.provider';
import { AiRetryService } from './ai.retry';

export interface RoutedProvider {
  provider: AiProvider;
  maxRetries: number;
}

@Injectable()
export class AiRouterService {
  private readonly logger = new Logger(AiRouterService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly retry: AiRetryService,
  ) {}

  /**
   * Builds the fallback chain: primary first, then the fallback pool.
   * Retry budget: primary AI_MAX_RETRIES_PRIMARY, each fallback AI_MAX_RETRIES_FALLBACK.
   */
  buildChain(): RoutedProvider[] {
    const kind = this.resolveKind();
    const primary = this.resolvePrimary(kind);
    const fallbacks = this.resolveFallbacks(kind);

    if (primary) {
      return [
        { provider: primary, maxRetries: this.getInt(AI_ENV.maxRetriesPrimary, DEFAULTS.maxRetriesPrimary) },
        ...fallbacks.map((provider) => ({
          provider,
          maxRetries: this.getInt(AI_ENV.maxRetriesFallback, DEFAULTS.maxRetriesFallback),
        })),
      ];
    }

    return fallbacks.map((provider) => ({
      provider,
      maxRetries: this.getInt(AI_ENV.maxRetriesFallback, DEFAULTS.maxRetriesFallback),
    }));
  }

  timeoutMs(): number {
    return this.getInt(AI_ENV.timeoutMs, DEFAULTS.timeoutMs);
  }

  private resolveKind(): AiProviderKind {
    const value = (this.config.get<string>(AI_ENV.provider) ?? DEFAULTS.provider).toLowerCase();
    if (value === 'deepseek' || value === 'openrouter' || value === 'mock') {
      return value;
    }
    this.logger.warn(`Unknown AI_PROVIDER "${value}", falling back to mock`);
    return 'mock';
  }

  private resolvePrimary(kind: AiProviderKind): AiProvider | null {
    const model = this.config.get<string>(AI_ENV.primaryModel) ?? DEFAULTS.primaryModel;

    if (kind === 'mock') {
      return null;
    }
    if (kind === 'deepseek') {
      const apiKey = this.config.get<string>(AI_ENV.deepseekApiKey) ?? '';
      if (!apiKey) {
        return null;
      }
      return new AiProvider({
        kind,
        model,
        baseURL: this.config.get<string>(AI_ENV.deepseekBaseUrl) ?? DEFAULTS.deepseekBaseUrl,
        apiKey,
      });
    }
    if (kind === 'openrouter') {
      const apiKey = this.config.get<string>(AI_ENV.openrouterApiKey) ?? '';
      if (!apiKey) {
        return null;
      }
      return new AiProvider({
        kind,
        model,
        baseURL: this.config.get<string>(AI_ENV.openrouterBaseUrl) ?? DEFAULTS.openrouterBaseUrl,
        apiKey,
      });
    }
    return null;
  }

  private resolveFallbacks(kind: AiProviderKind): AiProvider[] {
    if (kind === 'mock') {
      return [];
    }
    if (kind === 'openrouter') {
      return this.fallbackModels().map((model) => this.buildOpenrouter(model));
    }
    if (kind === 'deepseek') {
      const openrouterKey = this.config.get<string>(AI_ENV.openrouterApiKey) ?? '';
      if (!openrouterKey) {
        return [];
      }
      return this.fallbackModels().map((model) => this.buildOpenrouter(model));
    }
    return [];
  }

  private fallbackModels(): string[] {
    const raw = this.config.get<string>(AI_ENV.fallbackModels);
    if (!raw) {
      return [...DEFAULTS.fallbackModels];
    }
    return raw
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
  }

  private buildOpenrouter(model: string): AiProvider {
    return new AiProvider({
      kind: 'openrouter',
      model,
      baseURL: this.config.get<string>(AI_ENV.openrouterBaseUrl) ?? DEFAULTS.openrouterBaseUrl,
      apiKey: this.config.get<string>(AI_ENV.openrouterApiKey) ?? '',
    });
  }

  private getInt(key: string, fallback: number): number {
    const value = this.config.get<string>(key);
    const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }
}
