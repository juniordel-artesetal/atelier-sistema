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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'N├úo autorizado' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { action, targetStepId, motivo } = body

    const workItem = await prisma.workItem.findUnique({
      where: { id },
      include: { step: true, order: true }
    })

    if (!workItem) return NextResponse.json({ error: 'Item n├úo encontrado' }, { status: 404 })

    const userName = session.user.name
    const userId   = session.user.id

    // ÔöÇÔöÇ DEVOLU├ç├âO ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (action === 'revert') {
      if (!targetStepId) {
        return NextResponse.json({ error: 'Setor de destino obrigat├│rio' }, { status: 400 })
      }

      const targetStep = await prisma.workflowStep.findUnique({ where: { id: targetStepId } })
      if (!targetStep) return NextResponse.json({ error: 'Setor n├úo encontrado' }, { status: 404 })

      await prisma.$transaction([
        prisma.workItem.update({ where: { id }, data: { status: 'CANCELLED' } }),
        prisma.workItem.create({
          data: {
            workspaceId:             workItem.workspaceId,
            orderId:                 workItem.orderId,
            orderItemId:             workItem.orderItemId,
            stepId:                  targetStepId,
            departmentId:            targetStep.departmentId,
            status:                  'TODO',
            sectorNotes:             motivo ? `[DEVOLVIDO] ${motivo}` : '[DEVOLVIDO]',
            productionResponsibleId: workItem.productionResponsibleId ?? null,
          }
        }),
        prisma.order.update({
          where: { id: workItem.orderId },
          data: { status: 'IN_PROGRESS' }
        })
      ])

      // Hist├│rico de devolu├º├úo
      await addHistory(
        workItem.orderId, userId, userName,
        'setor',
        `${workItem.step.name} (devolvido)`,
        `${targetStep.name}${motivo ? ` ÔÇö motivo: ${motivo}` : ''}`
      )

      return NextResponse.json({ ok: true, action: 'reverted' })
    }

    // ÔöÇÔöÇ INICIAR ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (workItem.status === 'TODO') {
      await prisma.workItem.update({
        where: { id },
        data: { status: 'DOING', startedAt: new Date() }
      })
      await prisma.order.update({
        where: { id: workItem.orderId },
        data: { status: 'IN_PROGRESS' }
      })

      // Hist├│rico de in├¡cio
      await addHistory(
        workItem.orderId, userId, userName,
        'setor',
        `${workItem.step.name} ÔÇö Aguardando`,
        `${workItem.step.name} ÔÇö Em andamento`
      )

      return NextResponse.json({ ok: true, status: 'DOING' })
    }

    // ÔöÇÔöÇ CONCLUIR ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (workItem.status === 'DOING') {
      const currentStep = workItem.step
      let nextStep = null

      if (currentStep.id === 'step_impressao') {
        const productionType = workItem.order.productionType

        if (!productionType) {
          return NextResponse.json({
            error: 'Defina o Tipo de Produ├º├úo no pedido antes de concluir a Impress├úo.'
          }, { status: 400 })
        }

        const stepMap: Record<string, string> = {
          EXTERNA:        'step_prod_ext',
          INTERNA:        'step_prod_int',
          PRONTA_ENTREGA: 'step_pronta',
        }
        const targetId = stepMap[productionType]
        if (targetId) {
          nextStep = await prisma.workflowStep.findUnique({ where: { id: targetId } })
        }

      } else if (['step_prod_ext', 'step_prod_int', 'step_pronta'].includes(currentStep.id)) {
        nextStep = await prisma.workflowStep.findUnique({ where: { id: 'step_expedicao' } })

      } else if (currentStep.id === 'step_expedicao') {
        nextStep = null

      } else {
        nextStep = await prisma.workflowStep.findFirst({
          where: {
            workspaceId: currentStep.workspaceId,
            sortOrder: { gt: currentStep.sortOrder },
            id: { notIn: ['step_prod_ext', 'step_prod_int', 'step_pronta'] }
          },
          orderBy: { sortOrder: 'asc' }
        })
      }

      await prisma.workItem.update({
        where: { id },
        data: { status: 'DONE', doneAt: new Date() }
      })

      if (nextStep) {
        await prisma.workItem.create({
          data: {
            workspaceId:             workItem.workspaceId,
            orderId:                 workItem.orderId,
            orderItemId:             workItem.orderItemId,
            stepId:                  nextStep.id,
            departmentId:            nextStep.departmentId,
            status:                  'TODO',
            // Propaga o respons├ível pela produ├º├úo definido no setor Arte
            productionResponsibleId: workItem.productionResponsibleId ?? null,
          }
        })

        // Hist├│rico de avan├ºo de setor
        await addHistory(
          workItem.orderId, userId, userName,
          'setor',
          currentStep.name,
          nextStep.name
        )
      } else {
        await prisma.order.update({
          where: { id: workItem.orderId },
          data: { status: 'POSTED' }
        })

        // Hist├│rico de postagem
        await addHistory(
          workItem.orderId, userId, userName,
          'setor',
          currentStep.name,
          'Pedido enviado (POSTADO)'
        )
      }

      return NextResponse.json({ ok: true, status: 'DONE' })
    }

    return NextResponse.json({ error: 'A├º├úo inv├ílida para o status atual' }, { status: 400 })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

