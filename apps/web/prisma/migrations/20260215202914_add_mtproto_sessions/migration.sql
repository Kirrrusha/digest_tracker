-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "accessHash" TEXT,
ADD COLUMN     "botAccess" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "mtproto_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionData" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mtproto_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mtproto_sessions_userId_key" ON "mtproto_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_preferences_summaryInterval_idx" ON "user_preferences"("summaryInterval");

-- AddForeignKey
ALTER TABLE "mtproto_sessions" ADD CONSTRAINT "mtproto_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
