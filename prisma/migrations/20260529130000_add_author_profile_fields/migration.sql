-- AlterTable
ALTER TABLE `User` ADD COLUMN `bio` TEXT NULL,
    ADD COLUMN `jobTitle` VARCHAR(191) NULL,
    ADD COLUMN `knowsAbout` JSON NULL,
    ADD COLUMN `sameAs` JSON NULL,
    ADD COLUMN `slug` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_slug_key` ON `User`(`slug`);
