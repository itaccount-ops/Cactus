-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AbsenceType" ADD VALUE 'MARRIAGE';
ALTER TYPE "AbsenceType" ADD VALUE 'BEREAVEMENT_1ST_DEGREE';
ALTER TYPE "AbsenceType" ADD VALUE 'BEREAVEMENT_2ND_DEGREE';
ALTER TYPE "AbsenceType" ADD VALUE 'PUBLIC_DUTY';
ALTER TYPE "AbsenceType" ADD VALUE 'CHILD_SICKNESS';
ALTER TYPE "AbsenceType" ADD VALUE 'UNPAID_MONTH';

-- AlterTable
ALTER TABLE "Absence" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "hours" DOUBLE PRECISION,
ADD COLUMN     "isLooseDayWithoutNotice" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "childSicknessHoursBank" DOUBLE PRECISION NOT NULL DEFAULT 32,
ADD COLUMN     "looseVacationDaysUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "looseVacationDaysWithoutNotice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vacationModifications" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "_UserManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserManagers_AB_unique" ON "_UserManagers"("A", "B");

-- CreateIndex
CREATE INDEX "_UserManagers_B_index" ON "_UserManagers"("B");

-- AddForeignKey
ALTER TABLE "_UserManagers" ADD CONSTRAINT "_UserManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserManagers" ADD CONSTRAINT "_UserManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
