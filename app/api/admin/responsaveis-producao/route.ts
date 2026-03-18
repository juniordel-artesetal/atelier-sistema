import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const responsaveis = await prisma.productionResponsible.findMany({
    where: { workspaceId: 'ws_atelier' },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(responsaveis)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { name } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
    }

    const resp = await prisma.productionResponsible.create({
      data: { workspaceId: 'ws_atelier', name: name.trim() }
    })

    return NextResponse.json(resp)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar responsável' }, { status: 500 })
  }
}
