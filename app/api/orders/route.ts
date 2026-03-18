import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInitialWorkItemsForOrderItems } from "@/lib/workflow";

type CreateOrderItemInput = {
  productType: string;
  theme?: string | null;
  quantity: number;
  bowType?: string | null;
  bowColor?: string | null;
  needsApplique?: boolean;
  appliqueType?: string | null;
};

type CreateOrderBody = {
  workspaceId: string;
  externalOrderId?: string | null;
  channel?: string | null;
  purchaseDate?: string | null;
  plannedShipDate?: string | null;
  motherName?: string | null;
  childName?: string | null;
  items: CreateOrderItemInput[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderBody;

    if (!body?.workspaceId) {
      return NextResponse.json(
        { ok: false, error: "workspaceId é obrigatório." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "items é obrigatório e deve ter pelo menos 1 item." },
        { status: 400 }
      );
    }

    // Cria Order + OrderItems
    const order = await prisma.order.create({
      data: {
        workspaceId: body.workspaceId,
        externalOrderId: body.externalOrderId ?? null,
        channel: body.channel ?? null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        plannedShipDate: body.plannedShipDate ? new Date(body.plannedShipDate) : null,
        motherName: body.motherName ?? null,
        childName: body.childName ?? null,
        statusGlobal: "new",
        items: {
          create: body.items.map((it) => ({
            productType: it.productType,
            theme: it.theme ?? null,
            quantity: it.quantity,
            bowType: it.bowType ?? null,
            bowColor: it.bowColor ?? null,
            needsApplique: it.needsApplique ?? false,
            appliqueType: it.appliqueType ?? null,
          })),
        },
      },
      include: { items: true },
    });

    // Cria WorkItems iniciais no 1º step (ex: ARTES)
    const orderItemIds = order.items.map((i) => i.id);
    await createInitialWorkItemsForOrderItems({
  workspaceId,
  orderItemIds: createdOrderItemIds,
    });

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao criar pedido." },
      { status: 500 }
    );
  }
}