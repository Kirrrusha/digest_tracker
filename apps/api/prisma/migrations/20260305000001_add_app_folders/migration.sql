CREATE TABLE "app_folders" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "app_folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_AppFolderToChannel" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_AppFolderToChannel_AB_unique" ON "_AppFolderToChannel"("A", "B");
CREATE INDEX "_AppFolderToChannel_B_index" ON "_AppFolderToChannel"("B");
CREATE INDEX "app_folders_userId_idx" ON "app_folders"("userId");

ALTER TABLE "app_folders" ADD CONSTRAINT "app_folders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_AppFolderToChannel" ADD CONSTRAINT "_AppFolderToChannel_A_fkey"
  FOREIGN KEY ("A") REFERENCES "app_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_AppFolderToChannel" ADD CONSTRAINT "_AppFolderToChannel_B_fkey"
  FOREIGN KEY ("B") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
