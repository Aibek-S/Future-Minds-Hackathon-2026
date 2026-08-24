CREATE TYPE "MaterialIngestionStatus" AS ENUM ('VECTORIZING', 'COMPLETED', 'FAILED');

CREATE TABLE "MaterialIngestion" (
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

CREATE INDEX "MaterialIngestion_topicId_status_idx" ON "MaterialIngestion"("topicId", "status");
ALTER TABLE "MaterialIngestion" ADD CONSTRAINT "MaterialIngestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
