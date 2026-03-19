import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import QueueTable from './QueueTable'

export default async function SetorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = session.user.role

  if (role === 'OPERADOR') {
    const userDeptIds: string[] = (session.user.departments ?? []).map((d: any) =>
      typeof d === 'string' ? d : d.departmentId
    )
    if (!userDeptIds.includes(id)) {
      const firstAllowed = userDeptIds[0]
      redirect(firstAllowed ? `/setores/${firstAllowed}` : '/dashboard')
    }
  }

  const department = await prisma.department.findUnique({ where: { id } })
  if (!department) return notFound()

  const step = await prisma.workflowStep.findFirst({ where: { departmentId: id } })

  const operadores = await prisma.user.findMany({
    where: { workspaceId: 'ws_atelier', active: true, deletedAt: null },
    select: { id: true, name: true }
  })

  const responsaveisProducao = await prisma.productionResponsible.findMany({
    where: { workspaceId: 'ws_atelier', active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  })

  const workItemWhere: any = step
    ? { stepId: step.id, status: { in: ['TODO', 'DOING'] }, order: { deletedAt: null } }
    : { id: 'noop' }

  if (role === 'OPERADOR') {
    workItemWhere.responsibleId = session.user.id
  }

  const rawWorkItems = step
    ? await prisma.workItem.findMany({
        where: workItemWhere,
        include: {
          order: { include: { store: true, items: true } },
          responsible: { select: { id: true, name: true } },
          productionResponsible: { select: { id: true, name: true } },
          artResponsible: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' }
      })
    : []

  // Converter datas para string
  const workItems = rawWorkItems.map(wi => ({
    ...wi,
    createdAt: wi.createdAt.toISOString(),
    doneAt:    wi.doneAt    ? wi.doneAt.toISOString()    : null,
    dueDate:   wi.dueDate   ? wi.dueDate.toISOString()   : null,
    order: {
      ...wi.order,
      dueDate:   wi.order.dueDate   ? wi.order.dueDate.toISOString()   : null,
      createdAt: wi.order.createdAt.toISOString(),
    }
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{department.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{workItems.length} itens na fila</p>
      </div>
      <QueueTable
        workItems={workItems as any}
        operadores={operadores}
        departmentId={id}
        responsaveisProducao={responsaveisProducao}
      />
    </div>
  )
}
