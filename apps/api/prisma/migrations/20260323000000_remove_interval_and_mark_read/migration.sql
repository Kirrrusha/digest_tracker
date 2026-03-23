-- DropIndex
DROP INDEX IF EXISTS "user_preferences_summaryInterval_idx";

-- AlterTable
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "summaryInterval";
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "markTelegramAsRead";
