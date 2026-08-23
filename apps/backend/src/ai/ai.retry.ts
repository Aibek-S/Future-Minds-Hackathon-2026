import { Injectable, Logger } from '@nestjs/common';
import { APIError, APIConnectionTimeoutError } from 'openai';
import { RETRYABLE_HTTP_CODES } from './ai.constants';

export interface RetryContext {
  maxRetries: number;
  timeoutMs: number;
}

export interface RetryDecision {
  retry: boolean;
  delayMs?: number;
  reason?: string;
}

@Injectable()
export class AiRetryService {
  private readonly logger = new Logger(AiRetryService.name);

  decide(error: unknown, attempt: number, context: RetryContext): RetryDecision {
    const { maxRetries, timeoutMs } = context;
    if (attempt > maxRetries) {
      return { retry: false, reason: 'max retries exhausted' };
    }

    // Connection-level issues: timeout / network / no HTTP status (status 0).
    // These are transient and always worth retrying.
    if (this.isTimeout(error, timeoutMs)) {
      return { retry: true, delayMs: 500, reason: 'timeout' };
    }
    if (this.isNetworkError(error)) {
      return { retry: true, delayMs: 500, reason: 'network error' };
    }

    if (this.isApiError(error)) {
      const status = error.status ?? 0;
      if (RETRYABLE_HTTP_CODES.has(status)) {
        // 429 (rate limit) needs a longer backoff than transient 5xx.
        const base = status === 429 ? 1500 : 500;
        return { retry: true, delayMs: base * 2 ** (attempt - 1), reason: `http ${status}` };
      }
      return { retry: false, reason: `non-retryable http ${status}` };
    }

    return { retry: false, reason: 'unknown error' };
  }

  async wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private isApiError(error: unknown): error is APIError {
    return error instanceof APIError;
  }

  private isTimeout(error: unknown, timeoutMs: number): boolean {
    if (error instanceof APIConnectionTimeoutError) {
      return true;
    }
    const anyError = error as { message?: string; name?: string };
    return (
      anyError?.name === 'AbortError' ||
      anyError?.name === 'TimeoutError' ||
      (anyError?.message ?? '').includes('timeout') ||
      (anyError?.message ?? '').includes(`timed out after ${timeoutMs}`)
    );
  }

  private isNetworkError(error: unknown): boolean {
    const anyError = error as { message?: string; name?: string };
    const text = `${anyError?.name ?? ''} ${anyError?.message ?? ''}`;
    return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network error/i.test(text);
  }
}
