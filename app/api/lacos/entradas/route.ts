import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json([], { status: 403 })

    const { searchParams } = new URL(req.url)
    const userId   = searchParams.get('userId')   || null
    const dateFrom = searchParams.get('dateFrom') || null
    const dateTo   = searchParams.get('dateTo')   || null

    const where: any = { workspaceId: 'ws_atelier' }

    // OPERADOR só vê seus próprios lançamentos
    if (session.user.role === 'OPERADOR') {
      where.userId = session.user.id
    } else if (userId) {
      where.userId = userId
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
      }
    }

    const entries = await prisma.bowStockEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error(error)
    return NextResponse.json([])
  }
}
