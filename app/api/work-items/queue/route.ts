import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)
    const departmentId = searchParams.get('departmentId')

    if (!departmentId) {
      return NextResponse.json({ error: 'departmentId obrigat├│rio' }, { status: 400 })
    }

    const where: any = {
      departmentId,
      status: { in: ['TODO', 'DOING'] },
      // ÔöÇÔöÇ B2: Nunca retornar itens de pedidos com soft delete ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
      order: { deletedAt: null },
    }

    // OPERADOR s├│ v├¬ os itens atribu├¡dos a ele
    if (session?.user?.role === 'OPERADOR') {
      where.responsibleId = session.user.id
    }

    const items = await prisma.workItem.findMany({
      where,
      include: {
        order: { include: { store: true } },
        orderItem: true,
        responsible: true,
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar fila' }, { status: 500 })
  }
}

