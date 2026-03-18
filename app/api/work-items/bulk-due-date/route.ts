import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { workItemIds, dueDate } = await req.json()

    if (!workItemIds || !Array.isArray(workItemIds) || workItemIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum item selecionado' }, { status: 400 })
    }

    // Fix timezone: usar meio-dia UTC para evitar shift de -1 dia
    const parsedDate = dueDate ? new Date(`${dueDate}T12:00:00.000Z`) : null

    await prisma.workItem.updateMany({
      where: { id: { in: workItemIds } },
      data: { dueDate: parsedDate }
    })

    return NextResponse.json({ ok: true, affected: workItemIds.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar previsão em lote' }, { status: 500 })
  }
}
