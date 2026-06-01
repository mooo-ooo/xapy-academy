-- AlterTable: add MODERATOR to the Role enum on `User`.
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'USER', 'CTV', 'MODERATOR') NOT NULL DEFAULT 'USER';
