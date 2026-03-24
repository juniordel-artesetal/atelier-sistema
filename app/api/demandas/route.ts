import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET — lista demandas (Admin/Delegador vê todas, Operador vê só as suas)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const responsavelId = searchParams.get('responsavelId') || null

    const where: any = { workspaceId: 'ws_atelier' }

    // Operador vê só as demandas onde é o notifyUserId
    if (session.user.role === 'OPERADOR') {
      where.notifyUserId = session.user.id
    } else if (responsavelId) {
      where.productionResponsibleId = responsavelId
    }

    const demands = await prisma.$queryRaw`
      SELECT
        d."id",
        d."workspaceId",
        d."productionResponsibleId",
        d."notifyUserId",
        d."createdById",
        d."status",
        d."checkSepararLacos",
        d."checkSepararTags",
        d."checkSepararAdesivos",
        d."notifiedAt",
        d."createdAt",
        d."updatedAt",
        pr."name" AS "responsavelName",
        u."name"  AS "createdByName"
      FROM "Demand" d
      LEFT JOIN "ProductionResponsible" pr ON pr."id" = d."productionResponsibleId"
      LEFT JOIN "User" u ON u."id" = d."createdById"
      WHERE d."workspaceId" = 'ws_atelier'
      ${session.user.role === 'OPERADOR'
        ? prisma.$queryRaw`AND d."notifyUserId" = ${session.user.id}`
        : responsavelId
          ? prisma.$queryRaw`AND d."productionResponsibleId" = ${responsavelId}`
          : prisma.$queryRaw``
      }
      ORDER BY d."createdAt" DESC
    ` as any[]

    // Para cada demanda, busca os itens com info do pedido
    const result = await Promise.all(
      (demands as any[]).map(async (d: any) => {
        const items = await prisma.$queryRaw`
          SELECT
            di."id",
            di."orderId",
            o."externalId",
            o."recipientName",
            o."dueDate",
            o."productionType"
          FROM "DemandItem" di
          JOIN "Order" o ON o."id" = di."orderId"
          WHERE di."demandId" = ${d.id}
          ORDER BY o."dueDate" ASC
        ` as any[]

        // Busca todos os OrderItems dos pedidos para somar laços por cor
        const orderIds = items.map((i: any) => i.orderId)
        let bowSummary: Record<string, { cor: string; tipo: string; quantidade: number }> = {}

        if (orderIds.length > 0) {
          const orderItems = await prisma.orderItem.findMany({
            where: { orderId: { in: orderIds }, bowType: { not: 'NONE' } },
            select: { bowColor: true, bowType: true, bowQty: true },
          })
          for (const oi of orderItems) {
            if (!oi.bowColor || !oi.bowQty) continue
            const key = `${oi.bowColor}__${oi.bowType}`
            if (!bowSummary[key]) {
              bowSummary[key] = { cor: oi.bowColor, tipo: oi.bowType, quantidade: 0 }
            }
            bowSummary[key].quantidade += oi.bowQty
          }
        }

        return { ...d, items, bowSummary: Object.values(bowSummary) }
      })
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar demandas' }, { status: 500 })
  }
}

// POST — cria nova demanda
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { productionResponsibleId, notifyUserId, orderIds } = body

    if (!productionResponsibleId || !orderIds?.length) {
      return NextResponse.json({ error: 'Responsável e pedidos são obrigatórios' }, { status: 400 })
    }

    const id = Math.random().toString(36).slice(2) + Date.now().toString(36)

    await prisma.$executeRaw`
      INSERT INTO "Demand" ("id", "workspaceId", "productionResponsibleId", "notifyUserId", "createdById", "status")
      VALUES (${id}, 'ws_atelier', ${productionResponsibleId}, ${notifyUserId ?? null}, ${session.user.id}, 'PENDING')
    `

    for (const orderId of orderIds) {
      const itemId = Math.random().toString(36).slice(2) + Date.now().toString(36)
      await prisma.$executeRaw`
        INSERT INTO "DemandItem" ("id", "demandId", "orderId")
        VALUES (${itemId}, ${id}, ${orderId})
      `
    }

    return NextResponse.json({ id })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar demanda' }, { status: 500 })
  }
}
