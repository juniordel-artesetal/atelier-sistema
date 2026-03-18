import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { responsibleId, productionType } = await req.json()

    const workItem = await prisma.workItem.findUnique({
      where: { id },
      select: { orderId: true }
    })

    if (!workItem) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

    // Atualiza responsável
    await prisma.workItem.update({
      where: { id },
      data: { responsibleId: responsibleId || null }
    })

    // Atualiza productionType no pedido (se veio)
    if (productionType !== undefined) {
      await prisma.order.update({
        where: { id: workItem.orderId },
        data: { productionType: productionType || null }
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}