import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const departments = await prisma.department.findMany({
    where: { workspaceId: 'ws_atelier' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(departments)
}
