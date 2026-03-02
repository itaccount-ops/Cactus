/*
  Warnings:

  - A unique constraint covering the columns `[employeeCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('INDEFINIDO', 'TEMPORAL', 'OBRA_SERVICIO', 'PRACTICAS', 'FORMACION');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('VACATION', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "AbsenceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'COMPLETED', 'PAID');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "hourlyRate" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "canTrackHours" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "contractType" "ContractType",
ADD COLUMN     "emergencyContact" JSONB,
ADD COLUMN     "employeeCode" TEXT,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "personalDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "salary" DECIMAL(10,2),
ADD COLUMN     "ssNumber" TEXT,
ADD COLUMN     "vacationDays" INTEGER NOT NULL DEFAULT 23;

-- AlterTable
ALTER TABLE "UserDepartment" ADD COLUMN     "isManager" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL,
    "status" "AbsenceStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "overtime" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonuses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netSalary" DECIMAL(10,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Absence_userId_idx" ON "Absence"("userId");

-- CreateIndex
CREATE INDEX "Absence_startDate_endDate_idx" ON "Absence"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Absence_status_idx" ON "Absence"("status");

-- CreateIndex
CREATE INDEX "Absence_type_idx" ON "Absence"("type");

-- CreateIndex
CREATE INDEX "PayrollRecord_period_idx" ON "PayrollRecord"("period");

-- CreateIndex
CREATE INDEX "PayrollRecord_status_idx" ON "PayrollRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_userId_period_key" ON "PayrollRecord"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");

-- CreateIndex
CREATE INDEX "User_employeeCode_idx" ON "User"("employeeCode");

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
