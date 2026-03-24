import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function addHistory(orderId: string, userId: string, userName: string, field: string, oldValue: string, newValue: string) {
  await prisma.orderHistory.create({
    data: {
      id:       Math.random().toString(36).slice(2) + Date.now().toString(36),
      orderId,
      userId,
      userName,
      field,
      oldValue,
      newValue,
    }
  })
}

// Desconta o estoque de todos os itens de laço do pedido
async function descontarEstoque(orderId: string) {
  const allItems = await prisma.orderItem.findMany({ where: { orderId } })
  for (const orderItem of allItems) {
    if (!orderItem.bowColor || !orderItem.bowType || orderItem.bowType === 'NONE' || !orderItem.bowQty) continue
    const bowColorUpper = orderItem.bowColor.trim().toUpperCase()
    const existing = await prisma.bowStock.findFirst({
      where: { workspaceId: 'ws_atelier', bowColor: bowColorUpper, bowType: orderItem.bowType }
    })
    if (existing) {
      await prisma.bowStock.update({
        where: { id: existing.id },
        data:  { quantity: Math.max(0, existing.quantity - orderItem.bowQty) }
      })
    }
  }
}

// Verifica se algum item tem estoque insuficiente
async function verificarEstoqueInsuficiente(orderId: string): Promise<boolean> {
  const allItems = await prisma.orderItem.findMany({ where: { orderId } })
  for (const orderItem of allItems) {
    if (!orderItem.bowColor || !orderItem.bowType || orderItem.bowType === 'NONE' || !orderItem.bowQty) continue
    const bowColorUpper = orderItem.bowColor.trim().toUpperCase()
    const stock = await prisma.bowStock.findFirst({
      where: { workspaceId: 'ws_atelier', bowColor: bowColorUpper, bowType: orderItem.bowType }
    })
    const estoqueAtual = stock?.quantity ?? 0
    if (estoqueAtual < orderItem.bowQty) return true
  }
  return false
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { action, targetStepId, motivo } = body

    const workItem = await prisma.workItem.findUnique({
      where: { id },
      include: { step: true, order: true }
    })

    if (!workItem) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

    const userName = session.user.name
    const userId   = session.user.id

    // ── DEVOLUÇÃO ──────────────────────────────────────────────────
    if (action === 'revert') {
      if (!targetStepId) {
        return NextResponse.json({ error: 'Setor de destino obrigatório' }, { status: 400 })
      }

      const targetStep = await prisma.workflowStep.findUnique({ where: { id: targetStepId } })
      if (!targetStep) return NextResponse.json({ error: 'Setor não encontrado' }, { status: 404 })

      await prisma.$transaction([
        prisma.workItem.update({ where: { id }, data: { status: 'CANCELLED' } }),
        prisma.workItem.create({
          data: {
            workspaceId:  workItem.workspaceId,
            orderId:      workItem.orderId,
            orderItemId:  workItem.orderItemId,
            stepId:       targetStepId,
            departmentId: targetStep.departmentId,
            status:       'TODO',
            sectorNotes:  motivo ? `[DEVOLVIDO] ${motivo}` : '[DEVOLVIDO]',
            productionResponsibleId: workItem.productionResponsibleId ?? null,
          }
        }),
        prisma.order.update({
          where: { id: workItem.orderId },
          data: { status: 'IN_PROGRESS' }
        })
      ])

      await addHistory(
        workItem.orderId, userId, userName,
        'setor',
        `${workItem.step.name} (devolvido)`,
        `${targetStep.name}${motivo ? ` — motivo: ${motivo}` : ''}`
      )

      return NextResponse.json({ ok: true, action: 'reverted' })
    }

    // ── INICIAR ────────────────────────────────────────────────────
    if (workItem.status === 'TODO') {
      await prisma.workItem.update({
        where: { id },
        data: { status: 'DOING', startedAt: new Date() }
      })
      await prisma.order.update({
        where: { id: workItem.orderId },
        data: { status: 'IN_PROGRESS' }
      })

      await addHistory(
        workItem.orderId, userId, userName,
        'setor',
        `${workItem.step.name} — Aguardando`,
        `${workItem.step.name} — Em andamento`
      )

      return NextResponse.json({ ok: true, status: 'DOING' })
    }

    // ── CONCLUIR ───────────────────────────────────────────────────
    if (workItem.status === 'DOING') {
      const currentStep    = workItem.step
      const productionType = workItem.order.productionType
      let nextStep = null

      if (currentStep.id === 'step_impressao') {
        if (!productionType) {
          return NextResponse.json({
            error: 'Defina o Tipo de Produção no pedido antes de concluir a Impressão.'
          }, { status: 400 })
        }

        // Produção Externa vai para Separação de Demanda primeiro
        // Interna e Pronta Entrega vão direto para o setor de produção
        if (productionType === 'EXTERNA') {
          nextStep = await prisma.workflowStep.findUnique({ where: { id: 'step_separacao' } })
        } else {
          const stepMap: Record<string, string> = {
            INTERNA:        'step_prod_int',
            PRONTA_ENTREGA: 'step_pronta',
          }
          const targetId = stepMap[productionType]
          if (targetId) {
            nextStep = await prisma.workflowStep.findUnique({ where: { id: targetId } })
          }
        }

      } else if (currentStep.id === 'step_separacao') {
        // Separação de Demanda → Produção Externa
        nextStep = await prisma.workflowStep.findUnique({ where: { id: 'step_prod_ext' } })

      } else if (['step_prod_ext', 'step_prod_int', 'step_pronta'].includes(currentStep.id)) {
        nextStep = await prisma.workflowStep.findUnique({ where: { id: 'step_expedicao' } })

      } else if (currentStep.id === 'step_expedicao') {
        nextStep = null

      } else {
        nextStep = await prisma.workflowStep.findFirst({
          where: {
            workspaceId: currentStep.workspaceId,
            sortOrder: { gt: currentStep.sortOrder },
            id: { notIn: ['step_prod_ext', 'step_prod_int', 'step_pronta', 'step_separacao'] }
          },
          orderBy: { sortOrder: 'asc' }
        })
      }

      await prisma.workItem.update({
        where: { id },
        data: { status: 'DONE', doneAt: new Date() }
      })

      if (nextStep) {
        // ── Verificar estoque ao entrar em produção ────────────────
        let estoqueInsuficiente = false
        const prodDepts = ['dep_prod_ext', 'dep_prod_int', 'dep_pronta']
        if (prodDepts.includes(nextStep.departmentId)) {
          estoqueInsuficiente = await verificarEstoqueInsuficiente(workItem.orderId)
        }

        await prisma.workItem.create({
          data: {
            workspaceId:  workItem.workspaceId,
            orderId:      workItem.orderId,
            orderItemId:  workItem.orderItemId,
            stepId:       nextStep.id,
            departmentId: nextStep.departmentId,
            status:       'TODO',
            productionResponsibleId: workItem.productionResponsibleId ?? null,
            sectorNotes: estoqueInsuficiente ? '[ESTOQUE_INSUFICIENTE]' : null,
          }
        })

        // ── DESCONTO DE ESTOQUE ────────────────────────────────────
        // Pedidos NÃO pronta entrega → desconta ao SAIR da Impressão
        // Pedidos pronta entrega     → desconta ao SAIR da Expedição (bloco else abaixo)
        if (currentStep.id === 'step_impressao' && productionType !== 'PRONTA_ENTREGA') {
          await descontarEstoque(workItem.orderId)
        }

        await addHistory(
          workItem.orderId, userId, userName,
          'setor',
          currentStep.name,
          nextStep.name
        )

      } else {
        // nextStep === null → pedido sendo postado (saindo da Expedição)
        // Pronta entrega desconta aqui
        if (currentStep.id === 'step_expedicao' && productionType === 'PRONTA_ENTREGA') {
          await descontarEstoque(workItem.orderId)
        }

        await prisma.order.update({
          where: { id: workItem.orderId },
          data: { status: 'POSTED' }
        })

        await addHistory(
          workItem.orderId, userId, userName,
          'setor',
          currentStep.name,
          'Pedido enviado (POSTADO)'
        )
      }

      return NextResponse.json({ ok: true, status: 'DONE' })
    }

    return NextResponse.json({ error: 'Ação inválida para o status atual' }, { status: 400 })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
