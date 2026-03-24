import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Setores que contabilizam por ITENS (totalItems)
const SETORES_POR_ITENS = ['dep_prod_ext', 'dep_prod_int', 'dep_pronta']

// ── Tabela de preços ──────────────────────────────────────────────────────────
// Cofrinho sem laço  → R$0,20 por item
// Cofrinho com laço  → R$0,30 por item
const PRECO_SEM_LACO = 0.20
const PRECO_COM_LACO = 0.30

function calcularValor(bowType: string | null, totalItems: number): number {
  if (!bowType || bowType === 'NONE') return totalItems * PRECO_SEM_LACO
  return totalItems * PRECO_COM_LACO
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId   = searchParams.get('userId')   || null
    const dateFrom = searchParams.get('dateFrom') || null
    const dateTo   = searchParams.get('dateTo')   || null
    const deptId   = searchParams.get('deptId')   || null
    const bowType  = searchParams.get('bowType')  || null
    const produto  = searchParams.get('produto')  || null

    const where: any = {
      workspaceId: 'ws_atelier',
      status:      'DONE',
      doneAt:      { not: null },
      order:       { deletedAt: null },
    }

    if (userId)  where.responsibleId = userId
    if (deptId)  where.departmentId  = deptId
    if (bowType) where.orderItem = { bowType }
    if (produto) {
      where.order = {
        deletedAt: null,
        items: { some: { productName: { contains: produto, mode: 'insensitive' } } }
      }
    }
    if (dateFrom || dateTo) {
      where.doneAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
      }
    }

    const workItems = await prisma.workItem.findMany({
      where,
      include: {
        responsible: { select: { id: true, name: true } },
        department:  { select: { id: true, name: true } },
        orderItem:   { select: { totalItems: true, quantity: true, productName: true, bowType: true, bowQty: true, appliqueType: true, appliqueQty: true } },
        order:       { select: { externalId: true, recipientName: true } },
      },
      orderBy: { doneAt: 'desc' }
    })

    const grouped: Record<string, any> = {}

    for (const wi of workItems) {
      const key      = wi.responsibleId ?? 'sem_responsavel'
      const userName = wi.responsible?.name ?? 'Não atribuído'

      if (!grouped[key]) {
        grouped[key] = {
          userId: wi.responsibleId, userName,
          departments: {}, totalTarefas: 0,
          totalItens: 0, totalPedidos: 0, totalValor: 0, items: [],
        }
      }

      const g        = grouped[key]
      const dId      = wi.department.id
      const dName    = wi.department.name
      const porItens = SETORES_POR_ITENS.includes(dId)
      const metrica  = porItens ? 'itens' : 'pedidos'
      const itemQty  = wi.orderItem?.totalItems ?? wi.orderItem?.quantity ?? 1
      const bowTypeVal = wi.orderItem?.bowType ?? 'NONE'

      if (!g.departments[dId]) {
        g.departments[dId] = { name: dName, deptId: dId, metrica, count: 0, totalItems: 0 }
      }
      g.departments[dId].count++
      g.departments[dId].totalItems += porItens ? itemQty : 1

      g.totalTarefas++
      if (porItens) g.totalItens += itemQty
      else g.totalPedidos += 1

      let valorItem = 0
      if (porItens) {
        valorItem = calcularValor(bowTypeVal, itemQty)
        g.totalValor += valorItem
      }

      g.items.push({
        id:            wi.id,
        doneAt:        wi.doneAt,
        department:    dName,
        deptId:        dId,
        metrica,
        externalId:    wi.order.externalId,
        recipientName: wi.order.recipientName,
        productName:   wi.orderItem?.productName ?? null,
        totalItems:    itemQty,
        contabilizado: porItens ? itemQty : 1,
        bowType:       bowTypeVal,
        bowQty:        wi.orderItem?.bowQty     ?? null,
        appliqueType:  wi.orderItem?.appliqueType ?? null,
        appliqueQty:   wi.orderItem?.appliqueQty  ?? null,
        valor:         valorItem,
      })
    }

    const result = Object.values(grouped).sort((a: any, b: any) =>
      (b.totalItens * 10 + b.totalPedidos) - (a.totalItens * 10 + a.totalPedidos)
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar produtividade' }, { status: 500 })
  }
}
