import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const DEPT_ORDER = [
  'dep_arte', 'dep_arquivo', 'dep_impressao',
  'dep_prod_ext', 'dep_prod_int', 'dep_pronta', 'dep_expedicao',
]

const DEPT_ICONS: Record<string, string> = {
  dep_arte: '­ƒÄ¿', dep_arquivo: '­ƒùé´©Å', dep_impressao: '­ƒû¿´©Å',
  dep_prod_ext: '­ƒÅ¡', dep_prod_int: '­ƒ¬í', dep_pronta: 'Ô£à', dep_expedicao: '­ƒô¼',
}

export default async function DashboardPage() {
  const session   = await getServerSession(authOptions)
  const role      = session?.user?.role
  const isManager = role === 'ADMIN' || role === 'DELEGADOR'
  const isOp      = role === 'OPERADOR'

  const userDeptIds: string[] = isOp
    ? (session?.user?.departments ?? []).map((d: any) =>
        typeof d === 'string' ? d : d.departmentId)
    : []

  const statusWhere: any = isOp && userDeptIds.length > 0
    ? { workspaceId: 'ws_atelier', deletedAt: null,
        workItems: { some: { departmentId: { in: userDeptIds }, status: { in: ['TODO', 'DOING'] } } } }
    : { workspaceId: 'ws_atelier', deletedAt: null }

  const [pending, inProgress, posted, cancelled] = await Promise.all([
    prisma.order.count({ where: { ...statusWhere, status: 'PENDING'     } }),
    prisma.order.count({ where: { ...statusWhere, status: 'IN_PROGRESS' } }),
    prisma.order.count({ where: { ...statusWhere, status: 'POSTED'      } }),
    prisma.order.count({ where: { ...statusWhere, status: 'CANCELLED'   } }),
  ])

  const hoje   = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 2)

  const tarefasAtrasadas = isManager ? await prisma.workItem.findMany({
    where: { status: { in: ['TODO', 'DOING'] }, dueDate: { not: null, lt: amanha }, order: { deletedAt: null } },
    include: {
      order:       { select: { externalId: true, recipientName: true } },
      department:  { select: { name: true } },
      responsible: { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 10,
  }) : []

  const atrasadas    = tarefasAtrasadas.filter(t => t.dueDate! < hoje)
  const vencendoHoje = tarefasAtrasadas.filter(t => t.dueDate! >= hoje)

  const deptFilter = isOp && userDeptIds.length > 0
    ? { workspaceId: 'ws_atelier', id: { in: userDeptIds } }
    : { workspaceId: 'ws_atelier', id: { in: DEPT_ORDER } }

  const departments = await prisma.department.findMany({ where: deptFilter })

  const queueCounts = await Promise.all(
    departments.map(async dept => {
      const whereCount: any = {
        departmentId: dept.id,
        status:       { in: ['TODO', 'DOING'] },
        order:        { deletedAt: null },
      }
      if (isOp && session?.user?.id) whereCount.responsibleId = session.user.id
      const count = await prisma.workItem.count({ where: whereCount })
      return { ...dept, count }
    })
  )

  const orderRef = isOp && userDeptIds.length > 0 ? userDeptIds : DEPT_ORDER
  const sorted   = orderRef.map(id => queueCounts.find(d => d.id === id)).filter(Boolean) as typeof queueCounts

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{isOp ? 'Vis├úo do seu setor' : 'Vis├úo geral da produ├º├úo'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-1">Aguardando</p>
          <p className="text-3xl font-bold text-gray-800">{pending}</p>
          <p className="text-xs text-gray-400 mt-1">pedidos pendentes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-1">Em Produ├º├úo</p>
          <p className="text-3xl font-bold text-blue-500">{inProgress}</p>
          <p className="text-xs text-gray-400 mt-1">pedidos em andamento</p>
        </div>
      </div>

      {isManager && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/pedidos?status=POSTED">
            <div className="bg-white rounded-xl border border-teal-100 p-6 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Enviados</p>
                  <p className="text-3xl font-bold text-teal-500">{posted}</p>
                  <p className="text-xs text-gray-400 mt-1">pedidos postados</p>
                </div>
                <span className="text-2xl opacity-60 group-hover:opacity-100">­ƒô¼</span>
              </div>
              <p className="text-xs text-teal-500 mt-3 font-medium group-hover:underline">Ver todos os enviados ÔåÆ</p>
            </div>
          </Link>
          <Link href="/pedidos?status=CANCELLED">
            <div className="bg-white rounded-xl border border-red-100 p-6 hover:border-red-300 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cancelados</p>
                  <p className="text-3xl font-bold text-red-400">{cancelled}</p>
                  <p className="text-xs text-gray-400 mt-1">pedidos cancelados</p>
                </div>
                <span className="text-2xl opacity-60 group-hover:opacity-100">ÔØî</span>
              </div>
              <p className="text-xs text-red-400 mt-3 font-medium group-hover:underline">Ver todos os cancelados ÔåÆ</p>
            </div>
          </Link>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        {isOp ? 'Meus Setores' : 'Fila por Setor'}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {sorted.map(dept => (
          <Link key={dept.id} href={`/setores/${dept.id}`}>
            <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-purple-200 hover:shadow-sm transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{DEPT_ICONS[dept.id] ?? '­ƒôü'}</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{dept.name}</p>
                  <p className="text-xs text-gray-400">clique para ver a fila</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${dept.count > 0 ? 'text-purple-500' : 'text-green-400'}`}>{dept.count}</p>
                <p className="text-xs text-gray-400">itens</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {isManager && tarefasAtrasadas.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Alertas de Prazo</h2>
          <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
            <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">ÔÜá´©Å</span>
                <span className="font-semibold text-red-700">
                  {atrasadas.length > 0 ? `${atrasadas.length} tarefa(s) atrasada(s)` : ''}
                  {atrasadas.length > 0 && vencendoHoje.length > 0 ? ' ┬À ' : ''}
                  {vencendoHoje.length > 0 ? `${vencendoHoje.length} vence(m) hoje/amanh├ú` : ''}
                </span>
              </div>
              <span className="text-xs text-red-400">{tarefasAtrasadas.length} no total</span>
            </div>
            <div className="divide-y divide-gray-50">
              {tarefasAtrasadas.map(t => {
                const diffMs   = t.dueDate!.getTime() - hoje.getTime()
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                const atrasado = diffDays < 0
                return (
                  <div key={t.id} className={`px-5 py-3 flex items-center justify-between ${atrasado ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-yellow-400'}`}>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{t.order.recipientName}</p>
                      <p className="text-xs text-gray-500">
                        {t.department.name}
                        {t.responsible && ` ┬À ${t.responsible.name}`}
                        {t.order.externalId && ` ┬À ${t.order.externalId}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      atrasado ? 'bg-red-100 text-red-600' : diffDays === 0 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {atrasado ? `Atrasado ${Math.abs(diffDays)}d` : diffDays === 0 ? 'Vence hoje' : 'Vence amanh├ú'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

