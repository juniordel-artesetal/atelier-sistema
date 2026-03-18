import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })

    const { id } = await params
    const { artStatus } = await req.json()

    await prisma.order.update({
      where: { id },
      data: { artStatus: artStatus || null }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar status da arte' }, { status: 500 })
  }
}
