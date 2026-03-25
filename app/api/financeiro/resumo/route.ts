// app/api/financeiro/resumo/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'OPERADOR')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))
  const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))

  const totaisMes = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(CASE WHEN tipo='RECEITA' THEN COALESCE("valorRealizado",valor) ELSE 0 END),0)::float AS "totalReceita",
      COALESCE(SUM(CASE WHEN tipo='DESPESA' THEN COALESCE("valorRealizado",valor) ELSE 0 END),0)::float AS "totalDespesa"
    FROM "FinLancamento"
    WHERE "workspaceId"='ws_atelier'
      AND EXTRACT(YEAR  FROM data)=${ano}
      AND EXTRACT(MONTH FROM data)=${mes}
      AND status='PAGO'
  ` as any[]

  const pendentes = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(CASE WHEN tipo='RECEITA' THEN valor ELSE 0 END),0)::float AS "aReceber",
      COALESCE(SUM(CASE WHEN tipo='DESPESA' THEN valor ELSE 0 END),0)::float AS "aPagar"
    FROM "FinLancamento"
    WHERE "workspaceId"='ws_atelier' AND status='PENDENTE'
  ` as any[]

  const chartRaw: any[] = await prisma.$queryRaw`
    SELECT
      EXTRACT(YEAR  FROM data)::int AS ano,
      EXTRACT(MONTH FROM data)::int AS mes,
      COALESCE(SUM(CASE WHEN tipo='RECEITA' THEN COALESCE("valorRealizado",valor) ELSE 0 END),0)::float AS receita,
      COALESCE(SUM(CASE WHEN tipo='DESPESA' THEN COALESCE("valorRealizado",valor) ELSE 0 END),0)::float AS despesa
    FROM "FinLancamento"
    WHERE "workspaceId"='ws_atelier' AND status='PAGO'
      AND data >= (CURRENT_DATE - INTERVAL '11 months')::date
    GROUP BY ano,mes ORDER BY ano,mes
  `

  const fluxoRaw: any[] = await prisma.$queryRaw`
    SELECT
      EXTRACT(MONTH FROM data)::int AS mes,
      COALESCE(SUM(CASE WHEN tipo='RECEITA' AND status='PAGO'    THEN COALESCE("valorRealizado",valor) ELSE 0 END),0)::float AS receita,
      COALESCE(SUM(CASE WHEN tipo='DESPESA' AND status='PAGO'    THEN COALESCE("valorRealizado",valor) ELSE 0 END),0)::float AS despesa,
      COALESCE(SUM(CASE WHEN tipo='RECEITA' AND status='PENDENTE' THEN valor ELSE 0 END),0)::float AS "aReceber",
      COALESCE(SUM(CASE WHEN tipo='DESPESA' AND status='PENDENTE' THEN valor ELSE 0 END),0)::float AS "aPagar"
    FROM "FinLancamento"
    WHERE "workspaceId"='ws_atelier' AND EXTRACT(YEAR FROM data)=${ano}
    GROUP BY mes ORDER BY mes
  `

  const metaRaw: any[] = await prisma.$queryRaw`
    SELECT "metaReceita"::float,"metaDespesa"::float,"metaLucro"::float
    FROM "FinMeta"
    WHERE "workspaceId"='ws_atelier' AND ano=${ano} AND mes=${mes} LIMIT 1
  `

  const tr = Number(totaisMes[0]?.totalReceita || 0)
  const td = Number(totaisMes[0]?.totalDespesa || 0)
  const resultado = tr - td
  const margem = tr > 0 ? (resultado / tr) * 100 : 0

  const chart = chartRaw.map(r => ({
    label: MESES_ABR[Number(r.mes) - 1],
    receita: Number(r.receita), despesa: Number(r.despesa),
    resultado: Number(r.receita) - Number(r.despesa),
  }))

  const fluxoMap = new Map(fluxoRaw.map(r => [Number(r.mes), r]))
  let acumulado = 0
  const fluxo = MESES_ABR.map((label, i) => {
    const m    = fluxoMap.get(i + 1)
    const rec  = Number(m?.receita   || 0)
    const desp = Number(m?.despesa   || 0)
    const res  = rec - desp
    acumulado += res
    return { label, mes: i + 1, receita: rec, despesa: desp, resultado: res, acumulado, aReceber: Number(m?.aReceber || 0), aPagar: Number(m?.aPagar || 0) }
  })

  return NextResponse.json({
    totalReceita: tr, totalDespesa: td, resultado,
    margem: Number(margem.toFixed(1)),
    aReceber: Number(pendentes[0]?.aReceber || 0),
    aPagar:   Number(pendentes[0]?.aPagar   || 0),
    meta: metaRaw[0] || null,
    chart, fluxo,
  })
}
