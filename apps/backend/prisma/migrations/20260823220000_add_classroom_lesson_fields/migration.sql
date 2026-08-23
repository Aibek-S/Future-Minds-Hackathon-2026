-- Preserve existing lessons while introducing the topic link required by
-- lesson planning. New lesson creation will require topicId at the API layer.
ALTER TABLE "Lesson" ADD COLUMN "topicId" TEXT;

ALTER TABLE "Lesson"
ADD CONSTRAINT "Lesson_topicId_fkey"
FOREIGN KEY ("topicId") REFERENCES "Topic"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lesson" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Assignment" ADD COLUMN "dueDate" TIMESTAMP(3);

CREATE INDEX "Lesson_topicId_idx" ON "Lesson"("topicId");
