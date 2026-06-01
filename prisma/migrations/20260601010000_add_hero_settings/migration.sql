-- AlterTable: landing-hero customization fields on `SiteSetting`.
ALTER TABLE `SiteSetting`
  ADD COLUMN `heroImageUrl` TEXT NULL,
  ADD COLUMN `heroTranslations` JSON NULL;
