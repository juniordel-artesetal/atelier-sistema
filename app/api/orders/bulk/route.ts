import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function mapBowType(value: string | null): string {
  if (!value) return 'NONE'
  const v = value.toString().toUpperCase().trim()
  if (v === 'LUXURY' || v.includes('LUXO')) return 'LUXURY'
  if (v === 'SIMPLE' || v.includes('SIMPLES')) return 'SIMPLE'
  return 'NONE'
}

function mapAppliqueType(value: string | null): string {
  if (!value) return 'NONE'
  const v = value.toString().toUpperCase().trim()
  if (v === 'THREE_D_LUX' || v.includes('3D LUX') || v.includes('3D LUXO')) return 'THREE_D_LUX'
  if (v === 'THREE_D' || v.includes('3D')) return 'THREE_D'
  if (v === 'SIMPLE' || v.includes('SIMPLES')) return 'SIMPLE'
  return 'NONE'
}

function mapProductionType(value: string | null): string | null {
  if (!value) return null
  const v = value.toString().toUpperCase().trim()
  if (v.includes('EXT')) return 'EXTERNA'
  if (v.includes('INT')) return 'INTERNA'
  if (v.includes('PRONTA') || v.includes('ENTREGA')) return 'PRONTA_ENTREGA'
  return null
}

function mapStore(value: string): string {
  if (!value) return 'store_fofuras'
  const v = value.toString().toLowerCase()
  if (v.includes('arte')) return 'store_artes'
  return 'store_fofuras'
}

export async function POST(req: NextRequest) {
  try {
    const { pedidos } = await req.json()

    if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
      return NextResponse.json({ error: 'Nenhum pedido enviado' }, { status: 400 })
    }

    const firstStep = await prisma.workflowStep.findFirst({
      where: { workspaceId: 'ws_atelier' },
      orderBy: { sortOrder: 'asc' }
    })

    if (!firstStep) {
      return NextResponse.json({ error: 'Nenhum passo de workflow configurado' }, { status: 500 })
    }

    const created = []
    const errors  = []

    for (let i = 0; i < pedidos.length; i++) {
      const p = pedidos[i]

      try {
        if (!p.recipientName || !p.productName) {
          errors.push(`Item ${i + 1}: Destinatário e Produto são obrigatórios`)
          continue
        }

        const storeId = mapStore(p.storeId ?? '')

        const order = await prisma.order.create({
          data: {
            workspaceId:    'ws_atelier',
            storeId,
            externalId:     p.externalId     || null,
            buyerUsername:  p.buyerUsername   || null,
            recipientName:  p.recipientName,
            productType:    p.productName,
            theme:          p.theme           || null,
            dueDate:        p.dueDate ? new Date(p.dueDate) : null,
            notes:          p.notes           || null,
            productionType: mapProductionType(p.productionType) as any || null,
            status:         'PENDING',
            items: {
              create: [{
                productName:  p.productName,
                variation:    p.variation      || null,
                quantity:     Number(p.quantity) || 1,
                totalItems:   p.totalItems     ? Number(p.totalItems)  : null,
                childName:    p.childName      || null,
                bowColor:     p.bowColor       || null,
                bowType:      mapBowType(p.bowType) as any,
                bowQty:       p.bowQty         ? Number(p.bowQty)      : null,
                appliqueType: mapAppliqueType(p.appliqueType) as any,
                appliqueQty:  p.appliqueQty    ? Number(p.appliqueQty) : null,
              }]
            },
          },
          include: { items: true }
        })

        const orderItem = order.items[0]
        await prisma.workItem.create({
          data: {
            workspaceId:  'ws_atelier',
            orderId:      order.id,
            orderItemId:  orderItem.id,
            stepId:       firstStep.id,
            departmentId: firstStep.departmentId,
            status:       'TODO',
          }
        })

        created.push(order.id)
      } catch (err: any) {
        console.error(`Erro item ${i + 1}:`, err)
        errors.push(`Item ${i + 1}: ${err.message}`)
      }
    }

    return NextResponse.json({
      created: created.length,
      errors,
      message: `${created.length} pedidos importados${errors.length > 0 ? `, ${errors.length} erros` : ''}`
    })

  } catch (error: any) {
    console.error('Erro bulk:', error)
    return NextResponse.json({ error: 'Erro ao processar pedidos' }, { status: 500 })
  }
}
