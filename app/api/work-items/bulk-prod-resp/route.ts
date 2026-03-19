import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })

    const { workItemIds, productionResponsibleId, artResponsibleId } = await req.json()

    if (!workItemIds || !Array.isArray(workItemIds) || workItemIds.length === 0) {
      return NextResponse.json({ error: 'IDs invalidos' }, { status: 400 })
    }

    const data: any = {}
    if (productionResponsibleId !== undefined) data.productionResponsibleId = productionResponsibleId || null
    if (artResponsibleId !== undefined) data.artResponsibleId = artResponsibleId || null

    await prisma.workItem.updateMany({
      where: { id: { in: workItemIds } },
      data,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}
