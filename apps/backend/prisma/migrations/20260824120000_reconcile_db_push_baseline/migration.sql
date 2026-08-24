-- Reconciles databases that were created with `prisma db push` before the
-- migration history was introduced. Every statement is intentionally safe on
-- a fresh database where the previous migrations have already run.

DO $$ BEGIN
  CREATE TYPE "SessionKind" AS ENUM ('STUDENT_CHAT', 'DIAGNOSTIC', 'FEEDBACK', 'ORCHESTRATOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "VoiceFeedbackStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MaterialIngestionStatus" AS ENUM ('VECTORIZING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "topicId" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "correctAnswer" TEXT;

ALTER TABLE "TutorSession" ADD COLUMN IF NOT EXISTS "kind" "SessionKind" NOT NULL DEFAULT 'STUDENT_CHAT';
ALTER TABLE "TutorSession" DROP CONSTRAINT IF EXISTS "TutorSession_userId_fkey";
ALTER TABLE "TutorSession" DROP CONSTRAINT IF EXISTS "TutorSession_studentId_fkey";
ALTER TABLE "TutorSession" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "TutorSession" ALTER COLUMN "userId" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "VoiceFeedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "audioUrl" TEXT NOT NULL,
  "status" "VoiceFeedbackStatus" NOT NULL DEFAULT 'PENDING',
  "transcript" TEXT,
  "analysis" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VoiceFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MaterialIngestion" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "status" "MaterialIngestionStatus" NOT NULL DEFAULT 'VECTORIZING',
  "materialVectorId" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialIngestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Lesson_topicId_idx" ON "Lesson"("topicId");
CREATE INDEX IF NOT EXISTS "TutorSession_kind_userId_createdAt_idx" ON "TutorSession"("kind", "userId", "createdAt");
CREATE INDEX IF NOT EXISTS "VoiceFeedback_userId_createdAt_idx" ON "VoiceFeedback"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "VoiceFeedback_status_idx" ON "VoiceFeedback"("status");
CREATE INDEX IF NOT EXISTS "MaterialIngestion_topicId_status_idx" ON "MaterialIngestion"("topicId", "status");
CREATE INDEX IF NOT EXISTS "MaterialVector_embedding_hnsw_idx" ON "MaterialVector" USING HNSW ("embedding" vector_cosine_ops);

DO $$ BEGIN
  ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TutorSession" ADD CONSTRAINT "TutorSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TutorSession" ADD CONSTRAINT "TutorSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VoiceFeedback" ADD CONSTRAINT "VoiceFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MaterialIngestion" ADD CONSTRAINT "MaterialIngestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
