import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({ where: { workspaceId: 'ws_atelier' } })
  users.forEach(u => console.log(u.email, u.role, u.active, u.deletedAt))
  await prisma.$disconnect()
}

main()