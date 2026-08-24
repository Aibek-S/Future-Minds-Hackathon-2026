import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { AuthModule } from '../auth/auth.module';
import { RedisPubSubService } from './redis-pubsub.service';
@Module({ imports: [AuthModule], providers: [RealtimeGateway, RedisPubSubService], exports: [RealtimeGateway, RedisPubSubService] }) export class RealtimeModule {}
