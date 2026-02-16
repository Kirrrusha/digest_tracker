-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notificationTime" TEXT;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "telegramNotifications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notifyOnNewSummary" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notifyOnNewPosts" BOOLEAN NOT NULL DEFAULT false;
