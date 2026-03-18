import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const LOW_STOCK_THRESHOLD = 40

export async function GET() {
  try {
    const stocks = await prisma.bowStock.findMany({
      where: { workspaceId: 'ws_atelier' },
      orderBy: [{ bowColor: 'asc' }, { bowType: 'asc' }]
    })
    return NextResponse.json(stocks)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar estoque' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })

    const { bowColor, bowType, quantity, notes, responsavel } = await req.json()

    if (!bowColor || !bowType || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })
    }

    // Registra a entrada de produção
    await prisma.bowStockEntry.create({
      data: {
        workspaceId: 'ws_atelier',
        bowColor:    bowColor.trim().toUpperCase(),
        bowType,
        quantity:    Number(quantity),
        userId:      session.user.id,
        userName:    session.user.name ?? 'Desconhecido',
        notes:       notes || null,
        responsavel: responsavel || null,
      }
    })

    // Atualiza ou cria o estoque dessa cor/tipo
    const existing = await prisma.bowStock.findFirst({
      where: {
        workspaceId: 'ws_atelier',
        bowColor:    bowColor.trim().toUpperCase(),
        bowType,
      }
    })

    let stock
    if (existing) {
      stock = await prisma.bowStock.update({
        where: { id: existing.id },
        data:  { quantity: existing.quantity + Number(quantity) }
      })
    } else {
      stock = await prisma.bowStock.create({
        data: {
          workspaceId: 'ws_atelier',
          bowColor:    bowColor.trim().toUpperCase(),
          bowType,
          quantity:    Number(quantity),
        }
      })
    }

    const lowStock = stock.quantity <= LOW_STOCK_THRESHOLD

    return NextResponse.json({ ok: true, stock, lowStock })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao lançar producao' }, { status: 500 })
  }
}
