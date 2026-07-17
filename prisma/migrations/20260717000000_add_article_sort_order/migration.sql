-- AlterTable
ALTER TABLE `Article` ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `Article_moduleId_sortOrder_idx` ON `Article`(`moduleId`, `sortOrder`);

-- Backfill: sequence existing articles within each module by publish date
-- then creation date so the current display order is preserved as the initial
-- lesson order. Gaps of 10 leave room for future ▲▼ reorder inserts.
UPDATE `Article` AS `a`
JOIN (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `moduleId`
      ORDER BY (`publishedAt` IS NULL), `publishedAt` ASC, `createdAt` ASC, `id` ASC
    ) * 10 AS `seq`
  FROM `Article`
) AS `ordered` ON `a`.`id` = `ordered`.`id`
SET `a`.`sortOrder` = `ordered`.`seq`;
