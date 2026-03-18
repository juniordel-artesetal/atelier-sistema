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