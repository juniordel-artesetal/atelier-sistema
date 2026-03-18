<<<<<<< HEAD
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
      return NextResponse.json({ error: 'departmentId obrigatório' }, { status: 400 })
    }

    const where: any = {
      departmentId,
      status: { in: ['TODO', 'DOING'] },
      // ── B2: Nunca retornar itens de pedidos com soft delete ──────────────
      order: { deletedAt: null },
    }

    // OPERADOR só vê os itens atribuídos a ele
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
=======
// app/api/work-items/queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Para teste, você vai passar departmentId por query:
  // ?departmentId=dep_ARTES
  const departmentId = searchParams.get("departmentId");
  const workspaceId = searchParams.get("workspaceId") ?? "ws_default";

  if (!departmentId) {
    return NextResponse.json(
      { error: "departmentId é obrigatório. Ex: ?departmentId=dep_ARTES" },
      { status: 400 }
    );
  }

  const items = await prisma.workItem.findMany({
    where: {
      step: {
        workspaceId,
        departmentId,
      },
      status: { in: ["todo", "doing"] },
    },
    include: {
      step: true,
      orderItem: {
        include: {
          order: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    take: 200,
  });

  return NextResponse.json({ ok: true, items });
}
>>>>>>> 207ad57b321dc370732151e2e34243648c175230
