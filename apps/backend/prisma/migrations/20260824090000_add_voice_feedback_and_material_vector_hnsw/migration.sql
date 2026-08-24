-- CreateEnum
CREATE TYPE "VoiceFeedbackStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "VoiceFeedback" (
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

-- CreateIndex
CREATE INDEX "VoiceFeedback_userId_createdAt_idx" ON "VoiceFeedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceFeedback_status_idx" ON "VoiceFeedback"("status");

-- CreateIndex
CREATE INDEX "MaterialVector_embedding_hnsw_idx"
ON "MaterialVector" USING HNSW ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "VoiceFeedback"
ADD CONSTRAINT "VoiceFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
