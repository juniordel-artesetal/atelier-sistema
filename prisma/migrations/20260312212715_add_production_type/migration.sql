-- CreateEnum
CREATE TYPE "ProductionType" AS ENUM ('EXTERNA', 'INTERNA', 'PRONTA_ENTREGA');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "productionType" "ProductionType";
