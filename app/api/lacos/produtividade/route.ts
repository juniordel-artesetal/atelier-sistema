import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const PRECO_POR_LACO = 0.20

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId   = searchParams.get('userId')   || null
    const dateFrom = searchParams.get('dateFrom') || null
    const dateTo   = searchParams.get('dateTo')   || null
    const bowColor = searchParams.get('bowColor') || null
    const bowType  = searchParams.get('bowType')  || null

    const where: any = {
      workspaceId: 'ws_atelier',
    }

    if (userId)   where.userId    = userId
    if (bowColor) where.bowColor  = bowColor
    if (bowType)  where.bowType   = bowType
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
      }
    }

    const entries = await prisma.bowStockEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Agrupar por responsável de produção
    const grouped: Record<string, {
      responsavel: string
      totalLacos: number
      totalValor: number
      porCor: Record<string, { cor: string, tipo: string, quantidade: number }>
      entries: any[]
    }> = {}

    for (const entry of entries) {
      const key = entry.responsavel ?? entry.userName ?? 'Não informado'

      if (!grouped[key]) {
        grouped[key] = { responsavel: key, totalLacos: 0, totalValor: 0, porCor: {}, entries: [] }
      }

      const g = grouped[key]
      const valorEntry = entry.quantity * PRECO_POR_LACO
      g.totalLacos += entry.quantity
      g.totalValor += valorEntry

      const corKey = `${entry.bowColor}__${entry.bowType}`
      if (!g.porCor[corKey]) {
        g.porCor[corKey] = { cor: entry.bowColor, tipo: entry.bowType, quantidade: 0 }
      }
      g.porCor[corKey].quantidade += entry.quantity

      g.entries.push({
        id:         entry.id,
        createdAt:  entry.createdAt,
        bowColor:   entry.bowColor,
        bowType:    entry.bowType,
        quantity:   entry.quantity,
        userName:   entry.userName,
        notes:      entry.notes,
        responsavel: entry.responsavel,
        valor: valorEntry,
      })
    }

    const result = Object.values(grouped).sort((a, b) => b.totalLacos - a.totalLacos)

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar produtividade de laços' }, { status: 500 })
  }
}
