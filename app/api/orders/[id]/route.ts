import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createId } from '@paralleldrive/cuid2'

// Labels legíveis para os campos
const FIELD_LABELS: Record<string, string> = {
  externalId:     'ID Shopee',
  buyerUsername:  'ID Usuário',
  storeId:        'Loja',
  recipientName:  'Destinatário',
  dueDate:        'Data de Envio',
  notes:          'Observação',
  status:         'Status',
  theme:          'Tema',
  productionType: 'Tipo de Produção',
  artType:        'Tipo de Arte',
  artStatus:      'Status da Arte',
  productName:    'Produto',
  variation:      'Variação',
  quantity:       'Quantidade',
  totalItems:     'Qtd de Itens',
  childName:      'Nome e Idade',
  bowColor:       'Cor do Laço',
  bowType:        'Tipo do Laço',
  bowQty:         'Qtd de Laços',
  appliqueType:   'Tipo de Aplique',
  appliqueQty:    'Qtd de Apliques',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando', IN_PROGRESS: 'Em produção',
  DONE: 'Concluído', POSTED: 'Enviado', CANCELLED: 'Cancelado',
}
const PROD_LABEL: Record<string, string> = {
  EXTERNA: 'Externa', INTERNA: 'Interna', PRONTA_ENTREGA: 'Pronta Entrega',
}
const BOW_LABEL: Record<string, string> = {
  NONE: 'Sem laço', SIMPLE: 'Simples', LUXURY: 'Luxo',
}
const APPLIQUE_LABEL: Record<string, string> = {
  NONE: 'Sem aplique', SIMPLE: 'Simples', THREE_D: '3D', THREE_D_LUX: '3D Luxo',
}
const STORE_LABEL: Record<string, string> = {
  store_fofuras: 'Fofuras de Papel', store_artes: 'Artes e Tal',
}

function formatValue(field: string, value: any): string {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'status')         return STATUS_LABEL[value]  ?? value
  if (field === 'productionType') return PROD_LABEL[value]    ?? value
  if (field === 'bowType')        return BOW_LABEL[value]     ?? value
  if (field === 'appliqueType')   return APPLIQUE_LABEL[value] ?? value
  if (field === 'storeId')        return STORE_LABEL[value]   ?? value
  if (field === 'artStatus') {
    const ART_LABEL: Record<string, string> = {
      APROVADO: 'Aprovado', ARTE_IGUAL: 'Arte Igual',
      ARTE_CLIENTE: 'Arte Cliente', PRODUZIDO_SEM_APROVACAO: 'Produzido sem Aprovação'
    }
    return ART_LABEL[value] ?? value
  }
  if (field === 'dueDate')        return new Date(value).toLocaleDateString('pt-BR')
  return String(value)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const session = await getServerSession(authOptions)

    // Busca estado atual para comparação
    const current = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    })

    await prisma.order.update({
      where: { id },
      data: {
        externalId:     body.externalId     || null,
        storeId:        body.storeId        || null,
        recipientName:  body.recipientName,
        buyerUsername:  body.buyerUsername  || null,
        dueDate:        body.dueDate ? new Date(body.dueDate) : null,
        notes:          body.notes          || null,
        status:         body.status,
        theme:          body.theme          || null,
        productionType: body.productionType || null,
        artType:        body.artType        || null,
        artStatus:      body.artStatus      || null,
      }
    })

    if (body.itemId) {
      await prisma.orderItem.update({
        where: { id: body.itemId },
        data: {
          productName:  body.productName,
          variation:    body.variation     || null,
          quantity:     Number(body.quantity) || 1,
          totalItems:   body.totalItems    != null ? Number(body.totalItems)  : null,
          theme:        body.theme         || null,
          childName:    body.childName     || null,
          bowColor:     body.bowColor      || null,
          bowType:      body.bowType       || 'NONE',
          bowQty:       body.bowQty        != null ? Number(body.bowQty)      : null,
          appliqueType: body.appliqueType  || 'NONE',
          appliqueQty:  body.appliqueQty   != null ? Number(body.appliqueQty) : null,
        }
      })
    }

    // Registrar histórico de mudanças
    if (session?.user && current) {
      const item = current.items[0]
      const histories: any[] = []

      const orderFields: [string, any, any][] = [
        ['externalId',     current.externalId,     body.externalId     || null],
        ['buyerUsername',  current.buyerUsername,   body.buyerUsername  || null],
        ['storeId',        current.storeId,         body.storeId        || null],
        ['recipientName',  current.recipientName,   body.recipientName],
        ['dueDate',        current.dueDate?.toISOString(), body.dueDate || null],
        ['notes',          current.notes,           body.notes          || null],
        ['status',         current.status,          body.status],
        ['theme',          current.theme,           body.theme          || null],
        ['productionType', current.productionType,  body.productionType || null],
        ['artType',        (current as any).artType,        body.artType        || null],
        ['artStatus',      (current as any).artStatus,      body.artStatus      || null],
      ]

      const itemFields: [string, any, any][] = item ? [
        ['productName',  item.productName,  body.productName],
        ['variation',    item.variation,    body.variation    || null],
        ['quantity',     item.quantity,     Number(body.quantity) || 1],
        ['totalItems',   item.totalItems,   body.totalItems   != null ? Number(body.totalItems)  : null],
        ['childName',    item.childName,    body.childName    || null],
        ['bowColor',     item.bowColor,     body.bowColor     || null],
        ['bowType',      item.bowType,      body.bowType      || 'NONE'],
        ['bowQty',       item.bowQty,       body.bowQty       != null ? Number(body.bowQty)      : null],
        ['appliqueType', item.appliqueType, body.appliqueType || 'NONE'],
        ['appliqueQty',  item.appliqueQty,  body.appliqueQty  != null ? Number(body.appliqueQty) : null],
      ] : []

      for (const [field, oldVal, newVal] of [...orderFields, ...itemFields]) {
        const oldStr = oldVal == null ? '' : String(oldVal)
        const newStr = newVal == null ? '' : String(newVal)
        if (oldStr !== newStr) {
          histories.push({
            id:       Math.random().toString(36).slice(2),
            orderId:  id,
            userId:   session.user.id,
            userName: session.user.name,
            field,
            oldValue: formatValue(field, oldVal),
            newValue: formatValue(field, newVal),
          })
        }
      }

      if (histories.length > 0) {
        await prisma.orderHistory.createMany({ data: histories })
      }
    }

    return NextResponse.json({ ok: true })
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

    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { deletedAt: new Date() }
      }),
      prisma.workItem.updateMany({
        where: { orderId: id, status: { in: ['TODO', 'DOING'] } },
        data: { status: 'CANCELLED' }
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}
