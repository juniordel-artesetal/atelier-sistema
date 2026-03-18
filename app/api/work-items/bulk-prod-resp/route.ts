import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { workItemIds, productionResponsibleId } = await req.json()

    if (!workItemIds || !Array.isArray(workItemIds) || workItemIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum item selecionado' }, { status: 400 })
    }

    await prisma.workItem.updateMany({
      where: { id: { in: workItemIds } },
      data: { productionResponsibleId: productionResponsibleId || null }
    })

    return NextResponse.json({ ok: true, affected: workItemIds.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atribuir responsável' }, { status: 500 })
  }
}
