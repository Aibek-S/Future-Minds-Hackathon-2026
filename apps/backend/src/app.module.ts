import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TopicsModule } from './modules/topics/topics.module';
import { StudentsModule } from './modules/students/students.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { ChatModule } from './modules/chat/chat.module';
import { AiModule } from './ai/ai.module';
import { ClassesModule } from './modules/classes/classes.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { OrchestratorChatModule } from './modules/orchestrator-chat/orchestrator-chat.module';
import { DiagnosticModule } from './modules/diagnostic/diagnostic.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { VoiceFeedbackModule } from './modules/voice-feedback/voice-feedback.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AdminModule } from './modules/admin/admin.module';
import { DemoInterceptor } from './common/interceptors/demo.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(`redis://${config.get<string>('REDIS_HOST') ?? 'localhost'}:${config.get<string>('REDIS_PORT') ?? '6379'}`),
      }),
    }),
    PrismaModule,
    AiModule,
    AuthModule,
    TopicsModule,
    StudentsModule,
    AttemptsModule,
    SubjectsModule,
    ChatModule,
    ClassesModule,
    LessonsModule,
    AssignmentsModule,
    DashboardModule,
    OrchestratorModule,
    OrchestratorChatModule,
    DiagnosticModule,
    FeedbackModule,
    NotificationsModule,
    VoiceFeedbackModule,
    RealtimeModule,
    AdminModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: DemoInterceptor }],
})
export class AppModule {}
