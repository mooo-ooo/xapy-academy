-- AlterTable
ALTER TABLE `Sitesetting` ADD COLUMN `contactEmail` VARCHAR(191) NULL,
    ADD COLUMN `defaultMetaDescription` TEXT NULL,
    ADD COLUMN `defaultOgImageUrl` VARCHAR(191) NULL,
    ADD COLUMN `faviconUrl` VARCHAR(191) NULL,
    ADD COLUMN `logoUrl` VARCHAR(191) NULL,
    ADD COLUMN `tagline` TEXT NULL,
    ADD COLUMN `twitterHandle` VARCHAR(191) NULL;
