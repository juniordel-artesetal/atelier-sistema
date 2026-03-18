// app/api/dev/seed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInitialWorkItemsForOrderItems } from "@/lib/workflow";

export async function GET(req: Request) {
  try {
    // Segurança básica: evita rodar seed sem querer em produção
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "Seed desabilitado em produção." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId") ?? "ws_default";

    // 1) Workspace
    await prisma.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: "Workspace Default" },
    });

    // 2) Departamentos (cria os setores)
    const departments = [
      { id: "dep_ARTES", name: "Artes" },
      { id: "dep_IMPRESSAO", name: "Impressão" },
      { id: "dep_CORTE", name: "Corte" },
      { id: "dep_MONTAGEM", name: "Montagem" },
      { id: "dep_EXPEDICAO", name: "Expedição" },
    ];

    await prisma.department.createMany({
      data: departments.map((d) => ({
        id: d.id,
        name: d.name,
        workspaceId,
      })),
      skipDuplicates: true,
    });

    // 3) WorkflowSteps (uma “primeira etapa” por setor)
    // Importante: sortOrder em sequência global dentro do workspace
    const steps = [
      { id: "stp_ARTES_01", departmentId: "dep_ARTES", code: "ARTES_01", name: "Artes" , sortOrder: 10 },
      { id: "stp_IMP_01", departmentId: "dep_IMPRESSAO", code: "IMP_01", name: "Impressão" , sortOrder: 20 },
      { id: "stp_CORTE_01", departmentId: "dep_CORTE", code: "CORTE_01", name: "Corte" , sortOrder: 30 },
      { id: "stp_MONT_01", departmentId: "dep_MONTAGEM", code: "MONT_01", name: "Montagem" , sortOrder: 40 },
      { id: "stp_EXP_01", departmentId: "dep_EXPEDICAO", code: "EXP_01", name: "Expedição" , sortOrder: 50 },
    ];

    for (const s of steps) {
      await prisma.workflowStep.upsert({
        where: { id: s.id },
        update: {
          name: s.name,
          code: s.code,
          sortOrder: s.sortOrder,
          departmentId: s.departmentId,
          workspaceId,
        },
        create: {
          id: s.id,
          name: s.name,
          code: s.code,
          sortOrder: s.sortOrder,
          departmentId: s.departmentId,
          workspaceId,
        },
      });
    }

    // 4) Cria 1 pedido + 1 item para validar fila
    const order = await prisma.order.create({
      data: {
        workspaceId,
        channel: "seed",
        motherName: "MARIA (seed)",
        childName: "ANA (seed)",
        statusGlobal: "new",
        items: {
          create: [
            {
              productType: "cofre",
              theme: "sereia",
              quantity: 1,
              bowType: "gorgurao",
              bowColor: "rosa",
              needsApplique: true,
              appliqueType: "concha",
            },
          ],
        },
      },
      include: { items: true },
    });

    // 5) Cria WorkItems iniciais para os OrderItems criados
    await createInitialWorkItemsForOrderItems({
      workspaceId,
      orderItemIds: order.items.map((i) => i.id),
    });

    return NextResponse.json({
      ok: true,
      workspaceId,
      created: {
        departments: departments.length,
        steps: steps.length,
        orderId: order.id,
        orderItemIds: order.items.map((i) => i.id),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}