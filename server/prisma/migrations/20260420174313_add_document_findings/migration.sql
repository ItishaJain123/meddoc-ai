-- CreateTable
CREATE TABLE `DocumentFinding` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `bodyPart` VARCHAR(191) NULL,
    `finding` TEXT NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'Normal',
    `isAbnormal` BOOLEAN NOT NULL DEFAULT false,
    `reportDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentFinding_userId_idx`(`userId`),
    INDEX `DocumentFinding_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DocumentFinding` ADD CONSTRAINT `DocumentFinding_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentFinding` ADD CONSTRAINT `DocumentFinding_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
