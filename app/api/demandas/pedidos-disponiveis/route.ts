import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Setores de produção (após impressão)
const PROD_DEPT_IDS = ['dep_prod_ext', 'dep_prod_int', 'dep_pronta']

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const responsavelId = searchParams.get('responsavelId')

    if (!responsavelId) {
      return NextResponse.json({ error: 'responsavelId obrigatório' }, { status: 400 })
    }

    // Busca WorkItems nos setores de produção atribuídos à responsável
    const workItems = await prisma.workItem.findMany({
      where: {
        workspaceId:             'ws_atelier',
        departmentId:            { in: PROD_DEPT_IDS },
        status:                  { in: ['TODO', 'DOING'] },
        productionResponsibleId: responsavelId,
        order:                   { deletedAt: null, status: { not: 'CANCELLED' } },
      },
      include: {
        order:      { select: { id: true, externalId: true, recipientName: true, dueDate: true, productionType: true } },
        department: { select: { name: true } },
      },
      orderBy: { order: { dueDate: 'asc' } },
    })

    // Deduplica por orderId
    const seen = new Set<string>()
    const result = workItems
      .filter(wi => {
        if (seen.has(wi.order.id)) return false
        seen.add(wi.order.id)
        return true
      })
      .map(wi => ({
        workItemId:     wi.id,
        orderId:        wi.order.id,
        externalId:     wi.order.externalId,
        recipientName:  wi.order.recipientName,
        dueDate:        wi.order.dueDate?.toISOString() ?? null,
        productionType: wi.order.productionType,
        departmentName: wi.department.name,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 })
  }
}
