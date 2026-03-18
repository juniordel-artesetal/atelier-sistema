/*
  Warnings:

  - Made the column `storeId` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_storeId_fkey";

-- DropIndex
DROP INDEX "Order_externalId_idx";

-- DropIndex
DROP INDEX "Order_workspaceId_idx";

-- DropIndex
DROP INDEX "Order_workspaceId_status_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "productType" TEXT,
ADD COLUMN     "theme" TEXT,
ALTER COLUMN "storeId" SET NOT NULL,
ALTER COLUMN "channel" DROP NOT NULL,
ALTER COLUMN "channel" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
