import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const LOW_STOCK_THRESHOLD = 40

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json([])
    }

    const lowStocks = await prisma.bowStock.findMany({
      where: {
        workspaceId: 'ws_atelier',
        quantity: { lte: LOW_STOCK_THRESHOLD }
      },
      orderBy: { quantity: 'asc' }
    })

    return NextResponse.json(lowStocks)
  } catch (error) {
    console.error(error)
    return NextResponse.json([])
  }
}
