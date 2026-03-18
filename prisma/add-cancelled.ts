import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TYPE "WorkItemStatus" ADD VALUE IF NOT EXISTS 'CANCELLED'`)
  console.log('CANCELLED adicionado!')
  await prisma.$disconnect()
}

main()