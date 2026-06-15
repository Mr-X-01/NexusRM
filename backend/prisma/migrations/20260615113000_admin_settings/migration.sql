CREATE TYPE "UserStatus" AS ENUM ('active', 'invited', 'disabled');

ALTER TABLE "User"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "title" TEXT,
  ADD COLUMN "department" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "WorkspaceSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceSetting_key_key" ON "WorkspaceSetting"("key");
