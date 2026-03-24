import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json([])

    const now     = new Date()
    const today   = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z')
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 2)

    const notifications: any[] = []

    // ── Notificações de demanda (para todos os roles) ─────────────
    const demandNotifs = await prisma.$queryRaw`
      SELECT n."id", n."title", n."message", n."read", n."createdAt", n."demandId", n."type"
      FROM "Notification" n
      WHERE n."userId" = ${session.user.id}
        AND n."workspaceId" = 'ws_atelier'
      ORDER BY n."createdAt" DESC
      LIMIT 20
    ` as any[]

    for (const n of demandNotifs) {
      notifications.push({
        id:        n.id,
        type:      n.type,
        title:     n.title,
        message:   n.message,
        read:      n.read,
        demandId:  n.demandId,
        createdAt: n.createdAt,
        isDemand:  true,
      })
    }

    // ── Notificações de prazo (só Admin/Delegador) ─────────────────
    if (session.user.role !== 'OPERADOR') {
      const items = await prisma.workItem.findMany({
        where: {
          status:  { in: ['TODO', 'DOING'] },
          dueDate: { not: null, lt: tomorrow },
          order:   { deletedAt: null },
        },
        include: {
          order:       { select: { externalId: true, recipientName: true } },
          department:  { select: { name: true } },
          responsible: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' }
      })

      for (const wi of items) {
        const due      = new Date(wi.dueDate!)
        const diffMs   = due.getTime() - today.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const atrasado = diffDays < 0

        notifications.push({
          id:            wi.id,
          type:          'DUE_DATE',
          recipientName: wi.order.recipientName,
          externalId:    wi.order.externalId,
          department:    wi.department.name,
          responsible:   wi.responsible?.name ?? null,
          dueDate:       wi.dueDate,
          diffDays,
          atrasado,
          isDemand: false,
          label: atrasado
            ? `Atrasado ${Math.abs(diffDays)} dia(s)`
            : diffDays === 0
              ? 'Vence hoje'
              : 'Vence amanhã',
        })
      }
    }

    return NextResponse.json(notifications)
  } catch (error) {
    console.error(error)
    return NextResponse.json([])
  }
}

// PATCH — marca notificação como lida
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await req.json()
    await prisma.$executeRaw`
      UPDATE "Notification" SET "read" = true WHERE "id" = ${id} AND "userId" = ${session.user.id}
    `
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
