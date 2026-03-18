import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const history = await prisma.orderHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(history)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
  }
}
