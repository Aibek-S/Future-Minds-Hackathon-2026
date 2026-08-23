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
  ],
})
export class AppModule {}