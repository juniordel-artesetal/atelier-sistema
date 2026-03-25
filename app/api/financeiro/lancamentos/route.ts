// app/api/financeiro/lancamentos/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const tipo      = searchParams.get('tipo')
  const status    = searchParams.get('status')
  const mes       = searchParams.get('mes')
  const ano       = searchParams.get('ano')
  const catId     = searchParams.get('categoriaId')

  const vTipo   = ['RECEITA','DESPESA'].includes(tipo   || '') ? tipo   : null
  const vStatus = ['PAGO','PENDENTE'].includes(status || '') ? status : null
  const vMes    = mes && !isNaN(Number(mes)) ? Number(mes) : null
  const vAno    = ano && !isNaN(Number(ano)) ? Number(ano) : null

  const conditions: string[] = [`l."workspaceId" = $1`]
  const params: (string | number)[] = ['ws_atelier']

  if (vTipo)   { params.push(vTipo);   conditions.push(`l.tipo = $${params.length}`) }
  if (vStatus) { params.push(vStatus); conditions.push(`l.status = $${params.length}`) }
  if (vMes)    { params.push(vMes);    conditions.push(`EXTRACT(MONTH FROM l.data) = $${params.length}`) }
  if (vAno)    { params.push(vAno);    conditions.push(`EXTRACT(YEAR  FROM l.data) = $${params.length}`) }
  if (catId)   { params.push(catId);   conditions.push(`l."categoriaId" = $${params.length}`) }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT l.*, l.valor::float, l."valorRealizado"::float,
            c.nome AS "categoriaNome", c.cor AS "categoriaCor", c.icone AS "categoriaIcone"
     FROM "FinLancamento" l
     LEFT JOIN "FinCategoria" c ON c.id = l."categoriaId"
     WHERE ${conditions.join(' AND ')}
     ORDER BY l.data DESC, l."createdAt" DESC`,
    ...params
  )

  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { tipo, categoriaId, descricao, valor, data, status = 'PENDENTE', dataRealizada, valorRealizado, canal, referencia, observacoes } = await req.json()

  if (!tipo || !descricao || !valor || !data)
    return NextResponse.json({ error: 'Campos obrigatórios: tipo, descricao, valor, data' }, { status: 400 })

  const id      = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const catId   = categoriaId   || null
  const canalVal = canal        || null
  const refVal   = referencia   || null
  const obsVal   = observacoes  || null
  const drVal    = dataRealizada || null
  const vrVal    = valorRealizado ? Number(valorRealizado) : null

  // $executeRawUnsafe com cast explícito ::date para campos de data anuláveis
  await prisma.$executeRawUnsafe(
    `INSERT INTO "FinLancamento"
      ("id","workspaceId","tipo","categoriaId","descricao","valor","data","status","dataRealizada","valorRealizado","canal","referencia","observacoes")
    VALUES ($1,'ws_atelier',$2,$3,$4,$5,$6::date,$7,$8::date,$9,$10,$11,$12)`,
    id, tipo, catId, descricao,
    Number(valor), data, status,
    drVal, vrVal, canalVal, refVal, obsVal
  )

  const [row] = await prisma.$queryRaw`
    SELECT l.*, l.valor::float, l."valorRealizado"::float,
           c.nome AS "categoriaNome", c.cor AS "categoriaCor", c.icone AS "categoriaIcone"
    FROM "FinLancamento" l LEFT JOIN "FinCategoria" c ON c.id=l."categoriaId"
    WHERE l.id=${id}
  ` as any[]

  return NextResponse.json(row, { status: 201 })
}
