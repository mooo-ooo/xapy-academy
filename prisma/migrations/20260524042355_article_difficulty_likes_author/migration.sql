-- AlterTable
ALTER TABLE `article` ADD COLUMN `difficulty` ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NOT NULL DEFAULT 'BEGINNER',
    ADD COLUMN `likeCount` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `Article_authorId_idx` ON `Article`(`authorId`);

-- AddForeignKey
ALTER TABLE `Article` ADD CONSTRAINT `Article_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
