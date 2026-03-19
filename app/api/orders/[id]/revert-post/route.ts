import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas ADMIN pode reverter postagem' }, { status: 403 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        workItems: { orderBy: { createdAt: 'desc' } }
      }
    })

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (order.status !== 'POSTED') {
      return NextResponse.json({ error: 'Pedido não está com status Postado' }, { status: 400 })
    }

    // Buscar step da expedição
    const expedicaoStep = await prisma.workflowStep.findUnique({
      where: { id: 'step_expedicao' }
    })
    if (!expedicaoStep) return NextResponse.json({ error: 'Setor Expedicao não encontrado' }, { status: 404 })

    // Pegar o último workItem (que foi o da expedição concluído)
    const lastWorkItem = order.workItems[0]

    // Devolver laços ao estoque se houver
    const orderItem = order.items[0]
    if (orderItem?.bowColor && orderItem?.bowType && orderItem.bowType !== 'NONE' && orderItem.bowQty) {
      const bowColorUpper = orderItem.bowColor.trim().toUpperCase()
      const stock = await prisma.bowStock.findFirst({
        where: { workspaceId: 'ws_atelier', bowColor: bowColorUpper, bowType: orderItem.bowType }
      })
      if (stock) {
        await prisma.bowStock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity + orderItem.bowQty }
        })
      }
    }

    // Recriar WorkItem na expedição com status TODO
    await prisma.workItem.create({
      data: {
        workspaceId:  order.workspaceId,
        orderId:      order.id,
        orderItemId:  lastWorkItem?.orderItemId ?? null,
        stepId:       expedicaoStep.id,
        departmentId: expedicaoStep.departmentId,
        status:       'TODO',
        sectorNotes:  '[REVERTIDO] Postagem desfeita pelo ADMIN',
        productionResponsibleId: lastWorkItem?.productionResponsibleId ?? null,
      }
    })

    // Voltar status do pedido
    await prisma.order.update({
      where: { id },
      data: { status: 'IN_PROGRESS' }
    })

    // Registrar no histórico
    await prisma.orderHistory.create({
      data: {
        id:       Math.random().toString(36).slice(2) + Date.now().toString(36),
        orderId:  id,
        userId:   session.user.id,
        userName: session.user.name ?? 'Admin',
        field:    'status',
        oldValue: 'Postado',
        newValue: 'Em producao (revertido pelo ADMIN)',
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao reverter postagem' }, { status: 500 })
  }
}
