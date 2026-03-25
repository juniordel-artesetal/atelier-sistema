import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const body = await req.json()
    const { produtoId, tipo, canal, qtdKit, custoMaterial, custoMaoObra, custoEmbalagem, custoArte, impostos, precoVenda, materiais, kitItens } = body

    if (!produtoId) return NextResponse.json({ error: 'Produto obrigatório' }, { status: 400 })

    const custoTotal = Number(custoMaterial||0) + Number(custoMaoObra||0) + Number(custoEmbalagem||0) + Number(custoArte||0)
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36)

    await prisma.$executeRaw`
      INSERT INTO "PrecVariacao" ("id","produtoId","tipo","canal","qtdKit","custoMaterial","custoMaoObra","custoEmbalagem","custoArte","custoTotal","impostos","precoVenda","precoPromocional","metaVendas")
      VALUES (
        ${id}, ${produtoId}, ${tipo || 'UNITARIO'}, ${canal || 'shopee_ate79'}, ${Number(qtdKit||1)},
        ${Number(custoMaterial||0)}, ${Number(custoMaoObra||0)}, ${Number(custoEmbalagem||0)}, ${Number(custoArte||0)},
        ${custoTotal}, ${Number(impostos||0)}, ${precoVenda ? Number(precoVenda) : null}, null, null
      )
    `

    // Materiais (produto unitário)
    if (Array.isArray(materiais)) {
      for (const m of materiais) {
        const mid = Math.random().toString(36).slice(2) + Date.now().toString(36)
        await prisma.$executeRaw`
          INSERT INTO "PrecMaterialItem" ("id","variacaoId","materialId","nomeMaterial","qtdUsada","custoUnit","rendimento")
          VALUES (${mid}, ${id}, ${m.materialId||null}, ${m.nomeMaterial||''}, ${Number(m.qtdUsada||0)}, ${Number(m.custoUnit||0)}, ${Number(m.rendimento||1)})
        `
      }
    }

    // Kit itens
    if (Array.isArray(kitItens)) {
      for (const k of kitItens) {
        if (!k.produtoId) continue
        const kid = Math.random().toString(36).slice(2) + Date.now().toString(36)
        await prisma.$executeRaw`
          INSERT INTO "PrecKitItem" ("id","variacaoId","produtoId","nomeProduto","qtdItens","custoUnit")
          VALUES (${kid}, ${id}, ${k.produtoId}, ${k.nomeProduto||''}, ${Number(k.qtdItens||1)}, ${Number(k.custoUnit||0)})
        `
      }
    }

    return NextResponse.json({ id })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar configuração' }, { status: 500 })
  }
}
