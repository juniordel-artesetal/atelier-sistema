<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId') ?? 'ws_atelier'

    const orders = await prisma.order.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        store: true,
        items: true,
        workItems: {
          include: { department: true, step: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      externalId, buyerUsername, storeId, recipientName, dueDate,
      notes, productionType, artType, artStatus,
      productName, variation, quantity, totalItems, theme, childName,
      bowColor, bowType, bowQty, appliqueType, appliqueQty,
    } = body

    if (!recipientName || !productName) {
      return NextResponse.json(
        { error: 'Destinatário e Produto são obrigatórios' },
        { status: 400 }
      )
    }

    // Busca o primeiro step do workflow (Arte)
    const firstStep = await prisma.workflowStep.findFirst({
      where: { workspaceId: 'ws_atelier' },
      orderBy: { sortOrder: 'asc' }
    })

    if (!firstStep) {
      return NextResponse.json(
        { error: 'Nenhum passo de workflow configurado' },
        { status: 500 }
      )
    }

    const order = await prisma.order.create({
      data: {
        workspaceId:    'ws_atelier',
        storeId:        storeId        || 'store_fofuras',
        externalId:     externalId     || null,
        buyerUsername:  buyerUsername  || null,
        recipientName,
        productType:    productName,
        theme:          theme          || null,
        dueDate:        dueDate ? new Date(`${dueDate}T12:00:00.000Z`) : null,
        notes:          notes          || null,
        productionType: productionType || null,
        artType:        artType        || null,
        artStatus:      artStatus      || null,
        status:         'PENDING',
        items: {
          create: [{
            productName,
            variation:    variation    || null,
            quantity:     Number(quantity)   || 1,
            totalItems:   totalItems   != null ? Number(totalItems)   : null,
            theme:        theme        || null,
            childName:    childName    || null,
            bowColor:     bowColor     || null,
            bowType:      bowType      || 'NONE',
            bowQty:       bowQty       != null ? Number(bowQty)       : null,
            appliqueType: appliqueType || 'NONE',
            appliqueQty:  appliqueQty  != null ? Number(appliqueQty)  : null,
          }]
        }
      },
      include: { items: true }
    })

    // Cria o WorkItem inicial (setor Arte)
    await prisma.workItem.create({
      data: {
        workspaceId:  'ws_atelier',
        orderId:      order.id,
        orderItemId:  order.items[0].id,
        stepId:       firstStep.id,
        departmentId: firstStep.departmentId,
        status:       'TODO',
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 })
  }
}
=======
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
>>>>>>> 207ad57b321dc370732151e2e34243648c175230
