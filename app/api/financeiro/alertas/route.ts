// app/api/financeiro/alertas/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'OPERADOR')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const em7dias = new Date(hoje)
  em7dias.setDate(em7dias.getDate() + 7)

  // Busca todos os lançamentos PENDENTES (atrasados + próximos 7 dias)
  const rows: any[] = await prisma.$queryRaw`
    SELECT
      l.id, l.tipo, l.descricao, l.valor::float,
      l.data, l.canal, l."categoriaId",
      c.nome AS "categoriaNome",
      c.icone AS "categoriaIcone",
      c.cor AS "categoriaCor"
    FROM "FinLancamento" l
    LEFT JOIN "FinCategoria" c ON c.id = l."categoriaId"
    WHERE l."workspaceId" = 'ws_atelier'
      AND l.status = 'PENDENTE'
      AND l.data <= ${em7dias}::date
    ORDER BY l.data ASC
  `

  const result = rows.map(r => {
    const data     = new Date(r.data)
    data.setHours(0, 0, 0, 0)
    const diffMs   = data.getTime() - hoje.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    const atrasado = diffDays < 0

    let label: string
    if (diffDays < 0)       label = `${Math.abs(diffDays)}d atrasado`
    else if (diffDays === 0) label = 'Vence hoje'
    else if (diffDays === 1) label = 'Vence amanhã'
    else                     label = `Vence em ${diffDays}d`

    return {
      id:             r.id,
      tipo:           r.tipo,           // RECEITA | DESPESA
      descricao:      r.descricao,
      valor:          r.valor,
      data:           r.data,
      canal:          r.canal,
      categoriaNome:  r.categoriaNome,
      categoriaIcone: r.categoriaIcone,
      categoriaCor:   r.categoriaCor,
      diffDays,
      atrasado,
      label,
    }
  })

  return NextResponse.json(result)
}
