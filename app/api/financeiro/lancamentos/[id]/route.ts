// app/api/financeiro/lancamentos/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'OPERADOR')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const { tipo, categoriaId, descricao, valor, data, status, dataRealizada, valorRealizado, canal, referencia, observacoes } = await req.json()

  const catId    = categoriaId   || null
  const canalVal = canal         || null
  const refVal   = referencia    || null
  const obsVal   = observacoes   || null
  const drVal    = dataRealizada || null
  const vrVal    = valorRealizado ? Number(valorRealizado) : null

  await prisma.$executeRawUnsafe(
    `UPDATE "FinLancamento" SET
      tipo=$1, "categoriaId"=$2, descricao=$3,
      valor=$4, data=$5::date, status=$6,
      "dataRealizada"=$7::date,
      "valorRealizado"=$8,
      canal=$9, referencia=$10, observacoes=$11
    WHERE id=$12 AND "workspaceId"='ws_atelier'`,
    tipo, catId, descricao,
    Number(valor), data, status,
    drVal, vrVal,
    canalVal, refVal, obsVal, id
  )

  const [row] = await prisma.$queryRaw`
    SELECT l.*, l.valor::float, l."valorRealizado"::float,
           c.nome AS "categoriaNome", c.cor AS "categoriaCor", c.icone AS "categoriaIcone"
    FROM "FinLancamento" l LEFT JOIN "FinCategoria" c ON c.id=l."categoriaId"
    WHERE l.id=${id}
  ` as any[]

  return NextResponse.json(row)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'OPERADOR')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params

  await prisma.$executeRaw`
    DELETE FROM "FinLancamento" WHERE id=${id} AND "workspaceId"='ws_atelier'
  `

  return NextResponse.json({ ok: true })
}
