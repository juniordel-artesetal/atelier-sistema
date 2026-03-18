import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const workItems = await prisma.workItem.deleteMany({})
  console.log(`WorkItems deletados: ${workItems.count}`)

  const orderItems = await prisma.orderItem.deleteMany({})
  console.log(`OrderItems deletados: ${orderItems.count}`)

  const orders = await prisma.order.deleteMany({})
  console.log(`Pedidos deletados: ${orders.count}`)

  console.log('Banco limpo! Pode importar os pedidos novamente.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
