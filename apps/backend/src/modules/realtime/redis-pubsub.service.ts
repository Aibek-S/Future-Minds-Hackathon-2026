import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

type BrokerMessage = { origin: string; event: string; payload: Record<string, unknown> };

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private readonly origin = randomUUID();
  private readonly listeners = new Set<(message: BrokerMessage) => void>();
  private publisher?: Redis;
  private subscriber?: Redis;
  private readonly memoryCache = new Map<string, { value: string; expiresAt: number }>();
  constructor(private readonly config: ConfigService) {}
  onModuleInit() { void this.connect(); }
  onModuleDestroy() { this.publisher?.disconnect(); this.subscriber?.disconnect(); }
  onMessage(listener: (message: BrokerMessage) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  publish(event: string, payload: Record<string, unknown>) {
    if (this.publisher) void this.publisher.publish('ai-tutor:realtime', JSON.stringify({ origin: this.origin, event, payload })).catch(() => undefined);
  }
  async getCache(key: string) {
    if (this.publisher) return this.publisher.get(key).catch(() => null);
    const item = this.memoryCache.get(key);
    if (!item || item.expiresAt <= Date.now()) { this.memoryCache.delete(key); return null; }
    return item.value;
  }
  async setCache(key: string, value: string, ttlSeconds = 3600) {
    if (this.publisher) { await this.publisher.set(key, value, 'EX', ttlSeconds).catch(() => undefined); return; }
    this.memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
  private async connect() {
    const options = { host: this.config.get<string>('REDIS_HOST') ?? 'localhost', port: Number(this.config.get<string>('REDIS_PORT') ?? 6379), lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1, connectTimeout: 1500 };
    try {
      this.publisher = new Redis(options); this.subscriber = new Redis(options);
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      await this.subscriber.subscribe('ai-tutor:realtime');
      this.subscriber.on('message', (_channel, raw) => {
        try { const message = JSON.parse(raw) as BrokerMessage; if (message.origin !== this.origin) this.listeners.forEach((listener) => listener(message)); } catch { /* ignore malformed messages */ }
      });
    } catch {
      this.publisher?.disconnect(); this.subscriber?.disconnect(); this.publisher = undefined; this.subscriber = undefined;
      this.logger.warn('Redis pub/sub is unavailable; realtime is running in single-instance mode.');
    }
  }
}
