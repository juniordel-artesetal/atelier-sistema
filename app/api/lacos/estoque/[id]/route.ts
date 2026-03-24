import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT — ajuste manual de quantidade no estoque
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const { quantity, motivo } = await req.json()

    if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 })
    }

    // Busca estoque atual para calcular diferença
    const current = await prisma.bowStock.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Estoque não encontrado' }, { status: 404 })

    const diff = Number(quantity) - current.quantity

    // Atualiza o estoque
    await prisma.bowStock.update({
      where: { id },
      data: { quantity: Number(quantity) }
    })

    // Registra no histórico como ajuste manual
    await prisma.$executeRaw`
      INSERT INTO "BowStockEntry" ("id", "workspaceId", "bowColor", "bowType", "quantity", "userId", "userName", "notes", "responsavel")
      VALUES (
        ${Math.random().toString(36).slice(2) + Date.now().toString(36)},
        'ws_atelier',
        ${current.bowColor},
        ${current.bowType},
        ${diff},
        ${session.user.id},
        ${session.user.name},
        ${motivo ? `[AJUSTE MANUAL] ${motivo}` : '[AJUSTE MANUAL]'},
        null
      )
    `

    return NextResponse.json({ ok: true, newQuantity: Number(quantity), diff })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao ajustar estoque' }, { status: 500 })
  }
}
