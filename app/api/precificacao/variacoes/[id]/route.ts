import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PATCH — atualiza apenas o preço de venda (usado na tela Lista de SKUs)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    const { id } = await params
    const { precoVenda } = await req.json()

    await prisma.$executeRaw`
      UPDATE "PrecVariacao" SET "precoVenda" = ${Number(precoVenda)} WHERE "id" = ${id}
    `
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar preço' }, { status: 500 })
  }
}
