-- Own-reports-only guard: learn the account owner from the first report and
-- match every later upload against it.

-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `patientName` VARCHAR(191) NULL,
    ADD COLUMN `patientAliases` JSON NULL;

-- AlterTable
ALTER TABLE `Document`
    ADD COLUMN `extractedPatientName` VARCHAR(191) NULL,
    ADD COLUMN `identityMismatch` BOOLEAN NOT NULL DEFAULT false;
