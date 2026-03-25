import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
    const {
      tipo, isKit, canal, subOpcao, qtdKit,
      custoMaterial, custoMaoObra, custoEmbalagem, custoArte,
      impostos, precoVenda, emPromo, descontoPct, materiais
    } = body
    const custoTotal = Number(custoMaterial||0) + Number(custoMaoObra||0) + Number(custoEmbalagem||0) + Number(custoArte||0)

    await prisma.$executeRaw`
      UPDATE "PrecVariacao" SET
        "tipo"=${tipo||'UNITARIO'}, "isKit"=${isKit ? true : false},
        "canal"=${canal||'shopee'}, "subOpcao"=${subOpcao||'classico'},
        "qtdKit"=${Number(qtdKit||1)},
        "custoMaterial"=${Number(custoMaterial||0)}, "custoMaoObra"=${Number(custoMaoObra||0)},
        "custoEmbalagem"=${Number(custoEmbalagem||0)}, "custoArte"=${Number(custoArte||0)},
        "custoTotal"=${custoTotal}, "impostos"=${Number(impostos||0)},
        "precoVenda"=${precoVenda ? Number(precoVenda) : null},
        "emPromo"=${emPromo ? true : false},
        "descontoPct"=${descontoPct ? Number(descontoPct) : null}
      WHERE "id"=${id}
    `

    await prisma.$executeRaw`DELETE FROM "PrecMaterialItem" WHERE "variacaoId"=${id}`
    if (Array.isArray(materiais)) {
      for (const m of materiais) {
        const mid = Math.random().toString(36).slice(2) + Date.now().toString(36)
        await prisma.$executeRaw`
          INSERT INTO "PrecMaterialItem" ("id","variacaoId","materialId","nomeMaterial","qtdUsada","custoUnit","rendimento")
          VALUES (
            ${mid}, ${id}, ${m.materialId||null}, ${m.nomeMaterial||''},
            ${Number(m.qtdUsada||0)}, ${Number(m.custoUnit||0)}, ${Number(m.rendimento||1)}
          )
        `
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PUT variacoes]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    const { id } = await params
    const { precoVenda } = await req.json()
    await prisma.$executeRaw`UPDATE "PrecVariacao" SET "precoVenda"=${Number(precoVenda)} WHERE "id"=${id}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PATCH variacoes]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    const { id } = await params
    await prisma.$executeRaw`DELETE FROM "PrecVariacao" WHERE "id"=${id}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE variacoes]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
