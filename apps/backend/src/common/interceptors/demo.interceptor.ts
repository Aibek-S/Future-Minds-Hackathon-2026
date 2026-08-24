import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { createHash } from 'crypto';
import { Observable, from, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RedisPubSubService } from '../../modules/realtime/redis-pubsub.service';

@Injectable()
export class DemoInterceptor implements NestInterceptor {
  constructor(private readonly cache: RedisPubSubService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; method: string; originalUrl: string; body?: unknown }>();
    if (!request.headers['x-demo-user'] || request.method !== 'POST' || !request.originalUrl.includes('/orchestrator/query')) return next.handle();
    const key = `demo:orchestrator:${createHash('sha256').update(JSON.stringify(request.body ?? {})).digest('hex')}`;
    return from(this.cache.getCache(key)).pipe(mergeMap((cached) => {
      if (cached) return from(new Promise((resolve) => setTimeout(resolve, 350))).pipe(mergeMap(() => of(JSON.parse(cached))));
      return next.handle().pipe(mergeMap(async (value) => { await this.cache.setCache(key, JSON.stringify(value)); return value; }));
    }));
  }
}
