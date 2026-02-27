-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDirective" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserDepartment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" "Department" NOT NULL,

    CONSTRAINT "UserDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserDepartment_department_idx" ON "UserDepartment"("department");

-- CreateIndex
CREATE UNIQUE INDEX "UserDepartment_userId_department_key" ON "UserDepartment"("userId", "department");

-- AddForeignKey
ALTER TABLE "UserDepartment" ADD CONSTRAINT "UserDepartment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
