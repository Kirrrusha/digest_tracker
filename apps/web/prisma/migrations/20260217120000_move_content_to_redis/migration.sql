-- AlterTable: replace content with contentPreview
-- First add contentPreview populated from existing content
ALTER TABLE "posts" ADD COLUMN "contentPreview" VARCHAR(500);

-- Populate contentPreview from existing content (first 500 chars)
UPDATE "posts" SET "contentPreview" = LEFT("content", 500);

-- Drop the content column
ALTER TABLE "posts" DROP COLUMN "content";
