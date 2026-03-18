import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const users = await prisma.user.findMany({
    where: { workspaceId: 'ws_atelier' }, // sem filtro deletedAt — mostra todos
    include: { departments: { include: { department: true } } },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, departmentIds } = await req.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatorios faltando' }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ error: 'Email ja cadastrado' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        workspaceId: 'ws_atelier',
        name, email, password: hashed, role,
        departments: {
          create: (departmentIds ?? []).map((id: string) => ({ departmentId: id }))
        }
      },
      include: { departments: { include: { department: true } } }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar usuario' }, { status: 500 })
  }
}
