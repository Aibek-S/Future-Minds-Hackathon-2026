import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
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
  ],
})
export class AppModule {}
