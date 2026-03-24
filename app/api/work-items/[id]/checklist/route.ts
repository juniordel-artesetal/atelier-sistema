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
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Só DELEGADOR e ADMIN podem marcar checklist
    if (session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { checkLacos, checkTags, checkAdesivos } = body

    await prisma.$executeRaw`
      UPDATE "WorkItem"
      SET
        "checkLacos"    = ${checkLacos    ?? false},
        "checkTags"     = ${checkTags     ?? false},
        "checkAdesivos" = ${checkAdesivos ?? false},
        "updatedAt"     = NOW()
      WHERE "id" = ${id}
    `

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao salvar checklist' }, { status: 500 })
  }
}
