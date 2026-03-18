import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditarPedidoForm from './EditarPedidoForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarPedidoPage({ params }: Props) {
  const { id } = await params

  const order = await prisma.order.findFirst({
    where: { id, workspaceId: 'ws_atelier', deletedAt: null },
    include: {
      store: true,
      items: true,
      workItems: {
        include: { step: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!order) notFound()

  // Setor atual: prioriza DOING, depois TODO, depois o mais recente
  const currentWorkItem =
    order.workItems.find(w => w.status === 'DOING') ||
    order.workItems.find(w => w.status === 'TODO') ||
    order.workItems[0] ||
    null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Editar Pedido</h1>
        <p className="text-gray-500 text-sm mt-1">
          {order.externalId ? `ID Shopee: ${order.externalId}` : 'Pedido sem ID Shopee'}
        </p>
      </div>
      <EditarPedidoForm
        order={order}
        item={order.items[0]}
        currentStepName={currentWorkItem?.step?.name ?? null}
        currentStepStatus={currentWorkItem?.status ?? null}
      />
    </div>
  )
}