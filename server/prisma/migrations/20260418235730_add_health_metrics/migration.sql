-- CreateTable
CREATE TABLE `HealthMetric` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `metricName` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NULL,
    `refRangeLow` DOUBLE NULL,
    `refRangeHigh` DOUBLE NULL,
    `isAbnormal` BOOLEAN NOT NULL DEFAULT false,
    `isCritical` BOOLEAN NOT NULL DEFAULT false,
    `reportDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HealthMetric_userId_metricName_idx`(`userId`, `metricName`),
    INDEX `HealthMetric_userId_idx`(`userId`),
    INDEX `HealthMetric_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HealthMetric` ADD CONSTRAINT `HealthMetric_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthMetric` ADD CONSTRAINT `HealthMetric_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
