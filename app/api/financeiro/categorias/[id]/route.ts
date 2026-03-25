// app/api/financeiro/categorias/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const { nome, tipo, cor, icone } = await req.json()

  await prisma.$executeRaw`
    UPDATE "FinCategoria"
    SET nome=${nome}, tipo=${tipo}, cor=${cor}, icone=${icone}
    WHERE id=${id} AND "workspaceId"='ws_atelier'
  `

  const [row] = await prisma.$queryRaw`
    SELECT * FROM "FinCategoria" WHERE id=${id}
  ` as any[]

  return NextResponse.json(row)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params

  try {
    const [count] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM "FinLancamento"
      WHERE "categoriaId" = ${id} AND "workspaceId" = 'ws_atelier'
    ` as any[]

    const total = Number(count?.total ?? 0)

    if (total > 0)
      return NextResponse.json(
        { error: `Não é possível excluir: ${total} lançamento(s) usam essa categoria.` },
        { status: 409 }
      )

    await prisma.$executeRaw`
      DELETE FROM "FinCategoria"
      WHERE id = ${id} AND "workspaceId" = 'ws_atelier'
    `

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE categoria error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
