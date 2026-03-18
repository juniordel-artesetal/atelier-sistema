import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.update({
    where: { email: 'admin@atelier.com' },
    data: { password: hash }
  })
  console.log('Senha redefinida para: admin123')
  await prisma.$disconnect()
}

main()