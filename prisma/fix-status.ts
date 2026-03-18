import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function fix() {
  const doing = await prisma.workItem.findMany({ where: { status: 'DOING' } })
  for (const w of doing) {
    await prisma.order.update({ where: { id: w.orderId }, data: { status: 'IN_PROGRESS' } })
  }

  const done = await prisma.workItem.findMany({ where: { status: 'DONE' } })
  const orderIds = [...new Set(done.map(w => w.orderId))]
  for (const orderId of orderIds) {
    const hasActive = await prisma.workItem.findFirst({
      where: { orderId, status: { in: ['TODO', 'DOING'] } }
    })
    if (!hasActive) {
      await prisma.order.update({ where: { id: orderId }, data: { status: 'DONE' } })
    }
  }

  console.log('Status corrigidos!')
  await prisma.$disconnect()
}

fix()