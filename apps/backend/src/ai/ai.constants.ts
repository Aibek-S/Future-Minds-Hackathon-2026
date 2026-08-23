export const AI_ENV = {
  provider: 'AI_PROVIDER',
  primaryModel: 'AI_PRIMARY_MODEL',
  fallbackModels: 'AI_FALLBACK_MODELS',
  maxRetriesPrimary: 'AI_MAX_RETRIES_PRIMARY',
  maxRetriesFallback: 'AI_MAX_RETRIES_FALLBACK',
  timeoutMs: 'AI_TIMEOUT_MS',
  maxContextTokens: 'AI_MAX_CONTEXT_TOKENS',
  deepseekApiKey: 'DEEPSEEK_API_KEY',
  deepseekBaseUrl: 'DEEPSEEK_BASE_URL',
  openrouterApiKey: 'OPENROUTER_API_KEY',
  openrouterBaseUrl: 'OPENROUTER_BASE_URL',
} as const;

export const DEFAULTS = {
  provider: 'mock',
  primaryModel: 'deepseek-chat',
  fallbackModels: [
    'z-ai/glm-5.2:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'google/gemma-4-31b-it:free',
    'thinkingmachines/inkling:free',
    'nvidia/nemotron-3.5-lightning:free',
  ],
  maxRetriesPrimary: 2,
  maxRetriesFallback: 1,
  timeoutMs: 30_000,
  maxContextTokens: 60_000,
  deepseekBaseUrl: 'https://api.deepseek.com',
  openrouterBaseUrl: 'https://openrouter.ai/api/v1',
} as const;

export const RETRYABLE_HTTP_CODES = new Set([429, 500, 502, 503, 504]);
export const CONTEXT_TRUNCATE_ERROR_PATTERN = /context_length|maximum context|token limit/i;
