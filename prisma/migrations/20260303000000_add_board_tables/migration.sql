-- CreateTable
CREATE TABLE IF NOT EXISTS "Board" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BoardGroup" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "columns" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "BoardGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BoardItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BoardSubitem" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardSubitem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Board_companyId_idx" ON "Board"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Board_projectId_idx" ON "Board"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BoardGroup_boardId_idx" ON "BoardGroup"("boardId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BoardItem_groupId_idx" ON "BoardItem"("groupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BoardSubitem_itemId_idx" ON "BoardSubitem"("itemId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Board_companyId_fkey') THEN
    ALTER TABLE "Board" ADD CONSTRAINT "Board_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Board_projectId_fkey') THEN
    ALTER TABLE "Board" ADD CONSTRAINT "Board_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BoardGroup_boardId_fkey') THEN
    ALTER TABLE "BoardGroup" ADD CONSTRAINT "BoardGroup_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BoardItem_groupId_fkey') THEN
    ALTER TABLE "BoardItem" ADD CONSTRAINT "BoardItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "BoardGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BoardSubitem_itemId_fkey') THEN
    ALTER TABLE "BoardSubitem" ADD CONSTRAINT "BoardSubitem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "BoardItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
