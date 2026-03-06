-- AlterTable
ALTER TABLE "_AppFolderToChannel" ADD CONSTRAINT "_AppFolderToChannel_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_AppFolderToChannel_AB_unique";
