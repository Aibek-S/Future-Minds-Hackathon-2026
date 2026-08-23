import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TopicsModule } from './modules/topics/topics.module';
import { StudentsModule } from './modules/students/students.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { ClassesModule } from './modules/classes/classes.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';

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
    AuthModule,
    TopicsModule,
    StudentsModule,
    AttemptsModule,
    SubjectsModule,
    ClassesModule,
    LessonsModule,
    AssignmentsModule,
  ],
})
export class AppModule {}
