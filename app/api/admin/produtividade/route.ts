import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Setores que contabilizam por ITENS (totalItems)
const SETORES_POR_ITENS = ['dep_prod_ext', 'dep_prod_int', 'dep_pronta']

// Setores que contabilizam por PEDIDOS (count de tarefas)
const SETORES_POR_PEDIDOS = ['dep_arte', 'dep_arquivo', 'dep_impressao', 'dep_expedicao']

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
    if (bowType) {
      where.orderItem = { ...(where.orderItem ?? {}), bowType }
    }
    if (produto) {
      where.order = {
        ...( where.order ?? {} ),
        deletedAt: null,
        items: { some: { productName: { contains: produto, mode: 'insensitive' } } }
      }
    }
    if (dateFrom || dateTo) {
      where.doneAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) }                   : {}),
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

    // Agrupar por operador
    const grouped: Record<string, {
      userId: string | null
      userName: string
      departments: Record<string, {
        name: string
        deptId: string
        metrica: 'itens' | 'pedidos'
        count: number       // tarefas concluídas
        totalItems: number  // itens físicos (prod externa) ou pedidos (arte)
      }>
      totalTarefas: number
      totalItens: number    // prod externa: soma totalItems
      totalPedidos: number  // arte e outros: soma de tarefas
      items: any[]
    }> = {}

    for (const wi of workItems) {
      const key      = wi.responsibleId ?? 'sem_responsavel'
      const userName = wi.responsible?.name ?? 'Não atribuído'

      if (!grouped[key]) {
        grouped[key] = {
          userId:       wi.responsibleId,
          userName,
          departments:  {},
          totalTarefas: 0,
          totalItens:   0,
          totalPedidos: 0,
          totalBowQty:  0 as number,
          items:        [] as any[],
        }
      }

      const g         = grouped[key]
      const dId       = wi.department.id
      const dName     = wi.department.name
      const porItens  = SETORES_POR_ITENS.includes(dId)
      const metrica   = porItens ? 'itens' : 'pedidos'
      const itemQty   = wi.orderItem?.totalItems ?? wi.orderItem?.quantity ?? 1

      if (!g.departments[dId]) {
        g.departments[dId] = { name: dName, deptId: dId, metrica, count: 0, totalItems: 0 }
      }

      g.departments[dId].count++
      // Por itens: soma totalItems; por pedidos: soma 1 por tarefa
      g.departments[dId].totalItems += porItens ? itemQty : 1

      g.totalTarefas++
      if (porItens) {
        g.totalItens += itemQty
      } else {
        g.totalPedidos += 1
      }

      // Contabilizado é SEMPRE a quantidade de itens produzidos (cofrinhos)
      // O filtro de laço apenas segmenta quais pedidos aparecem, não muda a métrica
      const bowQtyVal    = wi.orderItem?.bowQty ?? null
      const bowTypeVal   = wi.orderItem?.bowType ?? 'NONE'
      const contabilizado = porItens ? itemQty : 1

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
        contabilizado,
        bowType:       bowTypeVal,
        bowQty:        bowQtyVal,
        appliqueType:  wi.orderItem?.appliqueType ?? null,
        appliqueQty:   wi.orderItem?.appliqueQty  ?? null,
      })
    }

    const result = Object.values(grouped).sort((a, b) => {
      // Ordena por total de itens primeiro, depois por pedidos
      const scoreA = a.totalItens * 10 + a.totalPedidos
      const scoreB = b.totalItens * 10 + b.totalPedidos
      return scoreB - scoreA
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar produtividade' }, { status: 500 })
  }
}
