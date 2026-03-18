import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import PedidosTable from './PedidosTable'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PedidosPage({ searchParams }: Props) {
  const { status } = await searchParams

  const orders = await prisma.order.findMany({
    where: { workspaceId: 'ws_atelier', deletedAt: null },
    include: {
      store: true,
      items: true,
      workItems: {
        where: { status: { in: ['TODO', 'DOING'] } },
        include: { step: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }
    },
    orderBy: { createdAt: 'desc' }
  })

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

      <PedidosTable orders={orders} initialStatus={status ?? ''} />
    </div>
  )
}
