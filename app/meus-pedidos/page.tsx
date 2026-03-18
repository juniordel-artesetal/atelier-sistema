import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MeusPedidosTable from './MeusPedidosTable'

export default async function MeusPedidosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OPERADOR') redirect('/pedidos')

  // Busca pedidos com WorkItems atribuídos à operadora
  const workItems = await prisma.workItem.findMany({
    where: {
      responsibleId: session.user.id,
      status:        { in: ['TODO', 'DOING'] },
      order:         { deletedAt: null },
    },
    include: {
      order: {
        include: { store: true, items: true }
      },
      step:       { select: { name: true } },
      department: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' }
  })

  // Deduplica por pedido (pode ter múltiplos workItems do mesmo pedido)
  const seen    = new Set<string>()
  const pedidos = workItems
    .filter(wi => { if (seen.has(wi.orderId)) return false; seen.add(wi.orderId); return true })
    .map(wi => ({ ...wi.order, setor: wi.step?.name ?? wi.department.name }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Meus Pedidos</h1>
        <p className="text-gray-500 text-sm mt-1">{pedidos.length} pedidos atribuídos a você</p>
      </div>
      <MeusPedidosTable pedidos={pedidos} />
    </div>
  )
}
