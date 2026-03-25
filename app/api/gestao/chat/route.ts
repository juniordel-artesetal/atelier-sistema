// app/api/gestao/chat/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const LIMITE_DIARIO = 5

// ── Taxas dos canais (atualizadas Março 2026)
function calcularTaxaCanal(canal: string, subOpcao: string, preco: number): { taxaPct: number; taxaFixa: number } {
  switch (canal) {
    case 'shopee':
    case 'shopee_ate79': {
      const pct = preco <= 79.99 ? 20 : 14
      const fixa = preco <= 79.99 ? 4 : preco <= 99.99 ? 16 : preco <= 199.99 ? 20 : 26
      return { taxaPct: pct, taxaFixa: fixa }
    }
    case 'mercado_livre':
      return subOpcao === 'premium'
        ? { taxaPct: 17, taxaFixa: preco < 79 ? 6 : 0 }
        : { taxaPct: 12, taxaFixa: preco < 79 ? 6 : 0 }
    case 'amazon':
      return { taxaPct: 12, taxaFixa: 2 }
    case 'tiktok':
    case 'tiktok_shop':
      return { taxaPct: 6, taxaFixa: preco < 79 ? 2 : 0 }
    case 'elo7':
      return subOpcao === 'maxima'
        ? { taxaPct: 20, taxaFixa: 3.99 }
        : { taxaPct: 18, taxaFixa: 3.99 }
    case 'magalu':
      return { taxaPct: 10, taxaFixa: 0 }
    case 'direta':
    case 'venda_direta':
      return { taxaPct: 3, taxaFixa: 0 }
    default:
      return { taxaPct: 20, taxaFixa: 4 }
  }
}

function fmtR(n: number) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const userId = session.user.id || session.user.email || 'admin'
  const body   = await req.json()
  const { contexto, mensagem, historico = [], ano, mes } = body

  // ── Verificar limite diário
  const hoje = new Date().toISOString().split('T')[0]
  let usageRow: any = null

  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM "AiUsageLog"
      WHERE "userId"=${userId} AND data=${hoje}::date
      LIMIT 1
    `
    usageRow = rows[0] || null
  } catch { /* tabela pode não existir ainda */ }

  if (usageRow && usageRow.calls >= LIMITE_DIARIO) {
    return NextResponse.json({
      error: `Limite diário de ${LIMITE_DIARIO} análises atingido. Tente novamente amanhã.`,
      limitAtingido: true,
    }, { status: 429 })
  }

  // ── Verificar cache (só para primeira mensagem do dia com mesmo mês)
  const cacheKey = `${ano}-${mes}`
  if (usageRow?.cacheKey === cacheKey && usageRow?.cacheDate === hoje && historico.length === 0) {
    try {
      const cached = JSON.parse(usageRow.cacheResult || '{}')
      if (cached.content) return NextResponse.json({ ...cached, fromCache: true })
    } catch { /* cache inválido, continua */ }
  }

  // ── Montar contexto financeiro em texto para a IA
  const fin = contexto?.financeiro || {}
  const periodo = `${MESES[(mes || 1) - 1]} ${ano}`

  // Calcular taxas reais por produto
  const produtosComTaxa = (contexto?.produtos || []).map((p: any) => {
    const { taxaPct, taxaFixa } = calcularTaxaCanal(p.canal, p.subOpcao, p.precoVenda)
    const taxaTotal = (p.precoVenda * taxaPct / 100) + taxaFixa
    const impostosVal = p.precoVenda * (p.impostos / 100)
    const lucroLiq = p.precoVenda - p.custoTotal - taxaTotal - impostosVal
    const margemLiq = p.precoVenda > 0 ? (lucroLiq / p.precoVenda) * 100 : 0
    return { ...p, taxaPct, taxaFixa, taxaTotal, lucroLiq, margemLiq }
  })

  const contextoBanco = `
DADOS REAIS DO ATELIÊ — ${periodo}
===============================================

FINANCEIRO DO MÊS
- Receita realizada: ${fmtR(fin.totalReceita || 0)}
- Despesa realizada: ${fmtR(fin.totalDespesa || 0)}
- Resultado: ${fmtR(fin.resultado || 0)}
- Margem líquida: ${fin.margem || 0}%
- Pedidos realizados: ${fin.qtdPedidos || 0}
- Ticket médio: ${fmtR(fin.ticketMedio || 0)}
- A receber (pendente): ${fmtR(fin.aReceber || 0)}
- A pagar (pendente): ${fmtR(fin.aPagar || 0)}

${contexto?.meta ? `METAS DO MÊS
- Meta receita: ${fmtR(contexto.meta.metaReceita || 0)}
- Meta despesa: ${fmtR(contexto.meta.metaDespesa || 0)}
- Meta lucro: ${fmtR(contexto.meta.metaLucro || 0)}` : 'Sem metas definidas para o mês'}

DESPESAS POR CATEGORIA
${(contexto?.despesasCat || []).map((d: any) => `- ${d.categoria || 'Sem categoria'}: ${fmtR(d.total)}`).join('\n')}

REGIME TRIBUTÁRIO: ${contexto?.tributo?.regime || 'MEI'} (alíquota: ${contexto?.tributo?.aliquotaPadrao || 0}%)

PRODUTOS CADASTRADOS (top 10 por preço)
${produtosComTaxa.map((p: any) => 
  `- ${p.produto} | Canal: ${p.canal}/${p.subOpcao} | Preço: ${fmtR(p.precoVenda)} | Custo: ${fmtR(p.custoTotal)} | Taxa canal: ${p.taxaPct}%+${fmtR(p.taxaFixa)} | Impostos: ${p.impostos}% | Lucro líquido/un: ${fmtR(p.lucroLiq)} | Margem líquida: ${p.margemLiq.toFixed(1)}%`
).join('\n')}

TENDÊNCIA (últimos meses realizados)
${(contexto?.tendencia || []).map((t: any) => 
  `- ${MESES[t.mes-1]}/${t.ano}: Receita ${fmtR(t.receita)} | Despesa ${fmtR(t.despesa)} | Resultado ${fmtR(t.receita - t.despesa)}`
).join('\n')}

TAXAS DOS CANAIS (Março 2026 — aplicadas nos cálculos acima)
- Shopee até R$79,99: 20% + R$4,00/item
- Shopee R$80-R$99,99: 14% + R$16,00/item  
- Shopee R$100-R$199,99: 14% + R$20,00/item
- Shopee acima R$200: 14% + R$26,00/item
- Mercado Livre Clássico: 10-14% + R$6,00 (< R$79)
- Mercado Livre Premium: 15-19% + R$6,00 (< R$79)
- Amazon: 10-15% + R$2,00/item
- TikTok Shop: 6% + R$2,00 (< R$79)
- Elo7 Padrão: 18% + R$3,99/item
- Elo7 Máxima: 20% + R$3,99/item
- Magalu: até 12%
- Venda Direta: 3%
===============================================`

  // ── System prompt completo
  const systemPrompt = `Você é uma analista financeira especialista em negócios de artesanato e marketplaces brasileiros, especialmente Shopee.

Você tem acesso aos dados reais do Ateliê sistema — use-os diretamente nos cálculos, sem pedir informações que já constam abaixo.

${contextoBanco}

REGRAS IMPORTANTES:
- Use SEMPRE os dados reais acima nos cálculos
- Aplique as taxas corretas de cada canal (já calculadas acima por produto)
- Linguagem simples, tom acolhedor, sem julgamento
- Não mostre fórmulas — explique apenas os resultados
- Use emojis para facilitar a leitura
- Formate com seções claras usando --- como separador
- Diagnóstico automático: 🟢 margem > 15% | 🟡 10-15% | 🔴 < 10%
- Quando calcular ponto de equilíbrio, use os custos fixos reais do banco
- Seja direta e objetiva — a empreendedora quer clareza, não enrolação
- Nunca recomende sair dos canais atuais
- Foque em margem, eficiência, preço, volume e estratégia`

  // ── Montar histórico de mensagens
  const messages = [
    ...historico,
    { role: 'user', content: mensagem }
  ]

  // ── Chamar Google Gemini Flash
  const apiKey = process.env.ANTHROPIC_API_KEY_GESTAO
  if (!apiKey) {
    console.error('GEMINI_API_KEY não configurada')
    return NextResponse.json({ error: 'Chave da IA não configurada no servidor.' }, { status: 500 })
  }

  // Montar histórico no formato Gemini
  const geminiMessages = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.7,
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    console.error('Gemini API error:', err)
    return NextResponse.json({ error: 'Erro ao chamar a IA. Tente novamente.' }, { status: 500 })
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível gerar a análise.'

  const result = { content, historico: [...messages, { role: 'assistant', content }] }

  // ── Atualizar uso + cache (primeira mensagem)
  try {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const novoCalls = (usageRow?.calls || 0) + 1
    const cacheResult = historico.length === 0 ? JSON.stringify(result) : (usageRow?.cacheResult || null)

    if (usageRow) {
      await prisma.$executeRaw`
        UPDATE "AiUsageLog" SET
          calls=${novoCalls},
          "cacheKey"=${cacheKey},
          "cacheResult"=${cacheResult},
          "cacheDate"=${hoje}::date
        WHERE "userId"=${userId} AND data=${hoje}::date
      `
    } else {
      await prisma.$executeRaw`
        INSERT INTO "AiUsageLog"("id","userId","data","calls","cacheKey","cacheResult","cacheDate")
        VALUES(${id},${userId},${hoje}::date,1,${cacheKey},${cacheResult},${hoje}::date)
      `
    }
  } catch (e) { console.error('Usage log error:', e) }

  return NextResponse.json(result)
}

// ── GET: retorna uso diário atual
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const userId = session.user.id || session.user.email || 'admin'
  const hoje   = new Date().toISOString().split('T')[0]

  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT calls FROM "AiUsageLog"
      WHERE "userId"=${userId} AND data=${hoje}::date LIMIT 1
    `
    return NextResponse.json({ calls: rows[0]?.calls || 0, limite: LIMITE_DIARIO })
  } catch {
    return NextResponse.json({ calls: 0, limite: LIMITE_DIARIO })
  }
}
