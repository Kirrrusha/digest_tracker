/*
  Warnings:

  - You are about to drop the column `topics` on the `summaries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "groupType" TEXT,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "summaries" DROP COLUMN "topics",
ADD COLUMN     "channelId" TEXT;

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "markTelegramAsRead" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SummaryToTopic" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SummaryToTopic_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "topics_name_key" ON "topics"("name");

-- CreateIndex
CREATE INDEX "_SummaryToTopic_B_index" ON "_SummaryToTopic"("B");

-- CreateIndex
CREATE INDEX "summaries_userId_channelId_idx" ON "summaries"("userId", "channelId");

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SummaryToTopic" ADD CONSTRAINT "_SummaryToTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SummaryToTopic" ADD CONSTRAINT "_SummaryToTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
