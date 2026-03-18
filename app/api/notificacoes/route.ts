import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json([])
    }

    const now   = new Date()
    const today = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z')
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 2) // inclui hoje + amanhã

    // Tarefas com dueDate vencido ou vencendo em 1 dia
    const items = await prisma.workItem.findMany({
      where: {
        status:  { in: ['TODO', 'DOING'] },
        dueDate: { not: null, lt: tomorrow },
        order:   { deletedAt: null },
      },
      include: {
        order:      { select: { externalId: true, recipientName: true } },
        department: { select: { name: true } },
        responsible:{ select: { name: true } },
      },
      orderBy: { dueDate: 'asc' }
    })

    const notifications = items.map(wi => {
      const due      = new Date(wi.dueDate!)
      const diffMs   = due.getTime() - today.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const atrasado = diffDays < 0

      return {
        id:            wi.id,
        recipientName: wi.order.recipientName,
        externalId:    wi.order.externalId,
        department:    wi.department.name,
        responsible:   wi.responsible?.name ?? null,
        dueDate:       wi.dueDate,
        diffDays,
        atrasado,
        label: atrasado
          ? `Atrasado ${Math.abs(diffDays)} dia(s)`
          : diffDays === 0
            ? 'Vence hoje'
            : 'Vence amanhã',
      }
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error(error)
    return NextResponse.json([])
  }
}
