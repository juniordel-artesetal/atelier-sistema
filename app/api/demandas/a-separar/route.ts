import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const PROD_DEPT_IDS = ['dep_separacao', 'dep_prod_ext', 'dep_prod_int', 'dep_pronta']

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const workItems = await prisma.workItem.findMany({
      where: {
        workspaceId:  'ws_atelier',
        departmentId: { in: PROD_DEPT_IDS },
        status:       { in: ['TODO', 'DOING'] },
        productionResponsibleId: { not: null },
        order: { deletedAt: null, status: { not: 'CANCELLED' } },
      },
      include: {
        order:                { select: { id: true, externalId: true, recipientName: true, dueDate: true, productionType: true, items: true } },
        department:           { select: { id: true, name: true } },
        productionResponsible:{ select: { id: true, name: true } },
      },
      orderBy: { order: { dueDate: 'asc' } },
    })

    // Agrupa por responsável de produção
    const grouped: Record<string, {
      responsavelId: string
      responsavelName: string
      orders: any[]
      bowSummary: Record<string, { cor: string; tipo: string; quantidade: number }>
    }> = {}

    const seenOrders = new Set<string>()

    for (const wi of workItems) {
      const respId   = wi.productionResponsibleId!
      const respName = wi.productionResponsible!.name

      if (!grouped[respId]) {
        grouped[respId] = { responsavelId: respId, responsavelName: respName, orders: [], bowSummary: {} }
      }

      // Deduplica por orderId
      if (seenOrders.has(`${respId}__${wi.order.id}`)) continue
      seenOrders.add(`${respId}__${wi.order.id}`)

      grouped[respId].orders.push({
        orderId:        wi.order.id,
        externalId:     wi.order.externalId,
        recipientName:  wi.order.recipientName,
        dueDate:        wi.order.dueDate?.toISOString() ?? null,
        productionType: wi.order.productionType,
        departmentName: wi.department.name,
      })

      // Soma laços por cor/tipo
      for (const oi of wi.order.items) {
        if (!oi.bowColor || !oi.bowQty || oi.bowType === 'NONE') continue
        const key = `${oi.bowColor}__${oi.bowType}`
        if (!grouped[respId].bowSummary[key]) {
          grouped[respId].bowSummary[key] = { cor: oi.bowColor, tipo: oi.bowType, quantidade: 0 }
        }
        grouped[respId].bowSummary[key].quantidade += oi.bowQty
      }
    }

    const result = Object.values(grouped).map(g => ({
      ...g,
      bowSummary: Object.values(g.bowSummary),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar pedidos a separar' }, { status: 500 })
  }
}
