// app/api/gestao/contexto/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))
  const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))

  // ── 1. Financeiro do mês selecionado (realizados)
  const finMes: any[] = await prisma.$queryRaw`
    SELECT
      tipo,
      COALESCE(SUM(CASE WHEN status='PAGO' THEN COALESCE("valorRealizado",valor) ELSE 0 END),0)::float AS realizado,
      COALESCE(SUM(CASE WHEN status='PENDENTE' THEN valor ELSE 0 END),0)::float AS pendente,
      COUNT(CASE WHEN status='PAGO' THEN 1 END)::int AS qtdPago
    FROM "FinLancamento"
    WHERE "workspaceId"='ws_atelier'
      AND EXTRACT(YEAR FROM data)=${ano}
      AND EXTRACT(MONTH FROM data)=${mes}
    GROUP BY tipo
  `

  // ── 2. Financeiro últimos 3 meses (tendência)
  const finTendencia: any[] = await prisma.$queryRaw`
    SELECT
      EXTRACT(YEAR FROM data)::int AS ano,
      EXTRACT(MONTH FROM data)::int AS mes,
      COALESCE(SUM(CASE WHEN tipo='RECEITA' AND status='PAGO' THEN COALESCE("valorRealizado",valor) ELSE 0 END),0)::float AS receita,
      COALESCE(SUM(CASE WHEN tipo='DESPESA' AND status='PAGO' THEN COALESCE("valorRealizado",valor) ELSE 0 END),0)::float AS despesa
    FROM "FinLancamento"
    WHERE "workspaceId"='ws_atelier' AND status='PAGO'
      AND data >= (CURRENT_DATE - INTERVAL '3 months')::date
    GROUP BY ano, mes ORDER BY ano, mes
  `

  // ── 3. Despesas por categoria (top 5)
  const despesasCat: any[] = await prisma.$queryRaw`
    SELECT
      c.nome AS categoria,
      COALESCE(SUM(COALESCE(l."valorRealizado",l.valor)),0)::float AS total
    FROM "FinLancamento" l
    LEFT JOIN "FinCategoria" c ON c.id = l."categoriaId"
    WHERE l."workspaceId"='ws_atelier'
      AND l.tipo='DESPESA' AND l.status='PAGO'
      AND EXTRACT(YEAR FROM l.data)=${ano}
      AND EXTRACT(MONTH FROM l.data)=${mes}
    GROUP BY c.nome ORDER BY total DESC LIMIT 5
  `

  // ── 4. Meta do mês
  const meta: any[] = await prisma.$queryRaw`
    SELECT "metaReceita"::float,"metaDespesa"::float,"metaLucro"::float
    FROM "FinMeta"
    WHERE "workspaceId"='ws_atelier' AND ano=${ano} AND mes=${mes}
    LIMIT 1
  `

  // ── 5. Produtos e margens (top 10 por preço de venda)
  const produtos: any[] = await prisma.$queryRaw`
    SELECT
      p.nome AS produto,
      v.canal,
      v."subOpcao",
      v."custoTotal"::float,
      v."precoVenda"::float,
      v.impostos::float,
      v."metaVendas"
    FROM "PrecVariacao" v
    JOIN "PrecProduto" p ON p.id = v."produtoId"
    WHERE p."workspaceId"='ws_atelier' AND p.ativo=true
      AND v."precoVenda" IS NOT NULL AND v."precoVenda" > 0
    ORDER BY v."precoVenda" DESC LIMIT 10
  `

  // ── 6. Config tributária
  const tributo: any[] = await prisma.$queryRaw`
    SELECT regime, "aliquotaPadrao"::float
    FROM "PrecConfigTributaria"
    WHERE "workspaceId"='ws_atelier' LIMIT 1
  `

  // ── Montar contexto financeiro
  const receita = finMes.find(r => r.tipo === 'RECEITA')
  const despesa = finMes.find(r => r.tipo === 'DESPESA')

  const totalReceita  = Number(receita?.realizado || 0)
  const totalDespesa  = Number(despesa?.realizado || 0)
  const resultado     = totalReceita - totalDespesa
  const margem        = totalReceita > 0 ? (resultado / totalReceita) * 100 : 0
  const qtdPedidos    = Number(receita?.qtdPago || 0)
  const ticketMedio   = qtdPedidos > 0 ? totalReceita / qtdPedidos : 0

  return NextResponse.json({
    periodo: { ano, mes },
    financeiro: {
      totalReceita,
      totalDespesa,
      resultado,
      margem: Number(margem.toFixed(1)),
      qtdPedidos,
      ticketMedio: Number(ticketMedio.toFixed(2)),
      aReceber: Number(receita?.pendente || 0),
      aPagar:   Number(despesa?.pendente || 0),
    },
    meta: meta[0] || null,
    despesasCat,
    tendencia: finTendencia,
    produtos: produtos.map(p => ({
      produto:    p.produto,
      canal:      p.canal,
      subOpcao:   p.subOpcao,
      custoTotal: Number(p.custoTotal),
      precoVenda: Number(p.precoVenda),
      impostos:   Number(p.impostos),
      margem:     p.precoVenda > 0
        ? Number(((p.precoVenda - p.custoTotal) / p.precoVenda * 100).toFixed(1))
        : 0,
      metaVendas: p.metaVendas,
    })),
    tributo: tributo[0] || { regime: 'MEI', aliquotaPadrao: 0 },
  })
}
