import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const { dueDate } = await req.json()

    // ── Bug fix: adicionar T12:00:00 para evitar shift de timezone UTC-3 ──
    const parsedDate = dueDate
      ? new Date(`${dueDate}T12:00:00.000Z`)
      : null

    const workItem = await prisma.workItem.update({
      where: { id },
      data: { dueDate: parsedDate }
    })

    return NextResponse.json({ ok: true, dueDate: workItem.dueDate })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar previsão' }, { status: 500 })
  }
}
