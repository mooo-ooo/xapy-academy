-- CreateTable
CREATE TABLE `UiMessage` (
    `locale` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UiMessage_locale_idx`(`locale`),
    PRIMARY KEY (`locale`, `key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
