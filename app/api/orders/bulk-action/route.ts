import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { action, orderIds, payload } = await req.json()

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum pedido selecionado' }, { status: 400 })
    }

    switch (action) {

      case 'delete': {
        await prisma.$transaction([
          prisma.order.updateMany({
            where: { id: { in: orderIds } },
            data: { deletedAt: new Date() }
          }),
          prisma.workItem.updateMany({
            where: { orderId: { in: orderIds }, status: { in: ['TODO', 'DOING'] } },
            data: { status: 'CANCELLED' }
          }),
        ])
        return NextResponse.json({ ok: true, affected: orderIds.length })
      }

      case 'status': {
        if (!payload?.status) {
          return NextResponse.json({ error: 'Status obrigatório' }, { status: 400 })
        }
        await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { status: payload.status }
        })
        return NextResponse.json({ ok: true, affected: orderIds.length })
      }

      case 'productionType': {
        await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { productionType: payload?.productionType || null }
        })
        return NextResponse.json({ ok: true, affected: orderIds.length })
      }

      case 'bowColor': {
        // Atualiza o primeiro OrderItem de cada pedido selecionado
        const items = await prisma.orderItem.findMany({
          where: { orderId: { in: orderIds } },
          select: { id: true }
        })
        await prisma.orderItem.updateMany({
          where: { id: { in: items.map(i => i.id) } },
          data: { bowColor: payload?.bowColor || null }
        })
        return NextResponse.json({ ok: true, affected: orderIds.length })
      }

      case 'bowType': {
        const items = await prisma.orderItem.findMany({
          where: { orderId: { in: orderIds } },
          select: { id: true }
        })
        await prisma.orderItem.updateMany({
          where: { id: { in: items.map(i => i.id) } },
          data: { bowType: payload?.bowType || 'NONE' }
        })
        return NextResponse.json({ ok: true, affected: orderIds.length })
      }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao executar ação' }, { status: 500 })
  }
}
