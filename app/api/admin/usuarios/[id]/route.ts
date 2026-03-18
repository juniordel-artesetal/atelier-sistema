import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, email, password, role, departmentIds, active } = await req.json()

    const data: any = { name, email, role }
    if (typeof active === 'boolean') data.active = active
    if (password) data.password = await bcrypt.hash(password, 10)

    // Atualiza setores — apaga todos e recria
    await prisma.userDepartment.deleteMany({ where: { userId: id } })

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        departments: {
          create: (departmentIds ?? []).map((deptId: string) => ({ departmentId: deptId }))
        }
      },
      include: { departments: { include: { department: true } } }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}