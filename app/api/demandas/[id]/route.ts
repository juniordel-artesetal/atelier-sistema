import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PATCH — atualiza checklist ou conclui demanda
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { action, checkSepararLacos, checkSepararTags, checkSepararAdesivos } = body

    // Busca a demanda
    const demands = await prisma.$queryRaw`
      SELECT d.*, pr."name" AS "responsavelName"
      FROM "Demand" d
      LEFT JOIN "ProductionResponsible" pr ON pr."id" = d."productionResponsibleId"
      WHERE d."id" = ${id}
    ` as any[]

    const demand = demands[0]
    if (!demand) return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 })

    // ── Atualizar checklist ──────────────────────────────────────
    if (action === 'updateChecklist') {
      await prisma.$executeRaw`
        UPDATE "Demand"
        SET
          "checkSepararLacos"    = ${checkSepararLacos ?? demand.checkSepararLacos},
          "checkSepararTags"     = ${checkSepararTags ?? demand.checkSepararTags},
          "checkSepararAdesivos" = ${checkSepararAdesivos ?? demand.checkSepararAdesivos},
          "updatedAt"            = NOW()
        WHERE "id" = ${id}
      `
      return NextResponse.json({ ok: true })
    }

    // ── Concluir demanda + enviar notificação ────────────────────
    if (action === 'complete') {
      if (session.user.role === 'OPERADOR') {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }

      await prisma.$executeRaw`
        UPDATE "Demand"
        SET "status" = 'READY', "notifiedAt" = NOW(), "updatedAt" = NOW()
        WHERE "id" = ${id}
      `

      // Busca a dueDate mais próxima dos pedidos dessa demanda
      const dueDates = await prisma.$queryRaw`
        SELECT MIN(o."dueDate") AS "minDueDate"
        FROM "DemandItem" di
        JOIN "Order" o ON o."id" = di."orderId"
        WHERE di."demandId" = ${id}
      ` as any[]

      const minDueDate = dueDates[0]?.minDueDate
      const dueDateStr = minDueDate
        ? new Date(minDueDate).toLocaleDateString('pt-BR')
        : null

      // Cria notificação para o usuário destinatário
      if (demand.notifyUserId) {
        const notifId = Math.random().toString(36).slice(2) + Date.now().toString(36)
        const title   = 'Demanda disponível para retirada'
        const message = dueDateStr
          ? `Sua demanda para entrega no dia ${dueDateStr} está disponível para retirada.`
          : `Sua demanda está disponível para retirada.`

        await prisma.$executeRaw`
          INSERT INTO "Notification" ("id", "workspaceId", "userId", "type", "title", "message", "demandId")
          VALUES (${notifId}, 'ws_atelier', ${demand.notifyUserId}, 'DEMAND_READY', ${title}, ${message}, ${id})
        `
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE — remove demanda
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    await prisma.$executeRaw`DELETE FROM "DemandItem" WHERE "demandId" = ${id}`
    await prisma.$executeRaw`DELETE FROM "Demand" WHERE "id" = ${id}`

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir demanda' }, { status: 500 })
  }
}
