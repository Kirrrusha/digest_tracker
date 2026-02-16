-- AlterTable: rename "type" to "sourceType" in channels
ALTER TABLE "channels" RENAME COLUMN "type" TO "sourceType";

-- AlterTable: add missing columns to channels
ALTER TABLE "channels" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "channels" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "channels_userId_isActive_idx" ON "channels"("userId", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "channels_sourceType_idx" ON "channels"("sourceType");

-- CreateIndex (missing post indexes)
CREATE INDEX IF NOT EXISTS "posts_channelId_idx" ON "posts"("channelId");
CREATE INDEX IF NOT EXISTS "posts_channelId_publishedAt_idx" ON "posts"("channelId", "publishedAt");

-- CreateIndex (missing summary indexes)
CREATE INDEX IF NOT EXISTS "summaries_userId_createdAt_idx" ON "summaries"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "summaries_createdAt_idx" ON "summaries"("createdAt");
