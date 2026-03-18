export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PedidosTable from './PedidosTable'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PedidosPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'OPERADOR') redirect('/meus-pedidos')

  const { status } = await searchParams

  const [rawOrders, operadores] = await Promise.all([
    prisma.order.findMany({
      where: { workspaceId: 'ws_atelier', deletedAt: null },
      include: {
        store: true,
        items: true,
        workItems: {
          where: { status: { in: ['TODO', 'DOING'] } },
          include: {
            step: true,
            responsible: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.findMany({
      where: { workspaceId: 'ws_atelier', active: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ])

  const orders = rawOrders.map(o => ({
    ...o,
    dueDate:   o.dueDate   ? o.dueDate.toISOString()   : null,
    createdAt: o.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} pedidos cadastrados</p>
        </div>
        <div className="flex gap-3">
          <Link href="/pedidos/importar"
            className="border border-purple-300 text-purple-600 font-medium px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-sm">
            Importar planilha
          </Link>
          <Link href="/pedidos/novo"
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm">
            + Novo pedido
          </Link>
        </div>
      </div>

      <PedidosTable orders={orders as any} initialStatus={status ?? ''} operadores={operadores} />
    </div>
  )
}
