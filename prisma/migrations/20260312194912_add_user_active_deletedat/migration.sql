-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_workspaceId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);
