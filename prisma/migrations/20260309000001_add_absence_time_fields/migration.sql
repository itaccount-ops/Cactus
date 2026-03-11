-- Add optional partial-day time range fields to Absence
ALTER TABLE "Absence" ADD COLUMN "startTime" TEXT;
ALTER TABLE "Absence" ADD COLUMN "endTime"   TEXT;
