import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const themes = await prisma.theme.findMany({
    where: { workspaceId: 'ws_atelier' },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(themes)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { name, bowColor } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
    }

    const theme = await prisma.theme.create({
      data: {
        workspaceId: 'ws_atelier',
        name: name.trim(),
        bowColor: bowColor?.trim() || null,
      }
    })

    return NextResponse.json(theme)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar tema' }, { status: 500 })
  }
}
