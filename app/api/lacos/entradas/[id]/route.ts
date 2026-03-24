import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// DELETE — exclui lançamento e desconta do estoque
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params

    // Busca o lançamento
    const entries = await prisma.$queryRaw`
      SELECT * FROM "BowStockEntry" WHERE "id" = ${id}
    ` as any[]

    const entry = entries[0]
    if (!entry) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })

    // Não permite excluir ajustes manuais (para manter auditoria)
    if (entry.notes?.includes('[AJUSTE MANUAL]')) {
      return NextResponse.json({ error: 'Ajustes manuais não podem ser excluídos' }, { status: 400 })
    }

    // Desconta do estoque o que foi lançado
    const stock = await prisma.bowStock.findFirst({
      where: { workspaceId: 'ws_atelier', bowColor: entry.bowColor, bowType: entry.bowType }
    })

    if (stock) {
      await prisma.bowStock.update({
        where: { id: stock.id },
        data: { quantity: Math.max(0, stock.quantity - entry.quantity) }
      })
    }

    // Exclui o lançamento
    await prisma.$executeRaw`DELETE FROM "BowStockEntry" WHERE "id" = ${id}`

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir lançamento' }, { status: 500 })
  }
}
