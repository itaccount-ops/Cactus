-- CreateEnum
CREATE TYPE "VacationModificationType" AS ENUM ('CHANGE_DATES', 'CANCEL_APPROVED', 'ADD_DAYS', 'REDUCE_DAYS');

-- CreateEnum
CREATE TYPE "VacationModificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "VacationModification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "absenceId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "type" "VacationModificationType" NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL,
    "status" "VacationModificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationModification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VacationModification_userId_idx" ON "VacationModification"("userId");

-- CreateIndex
CREATE INDEX "VacationModification_status_idx" ON "VacationModification"("status");

-- CreateIndex
CREATE INDEX "VacationModification_absenceId_idx" ON "VacationModification"("absenceId");

-- AddForeignKey
ALTER TABLE "VacationModification" ADD CONSTRAINT "VacationModification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationModification" ADD CONSTRAINT "VacationModification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationModification" ADD CONSTRAINT "VacationModification_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "Absence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
