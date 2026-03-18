import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import UsuariosTable from './UsuariosTable'

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({
    where: { workspaceId: 'ws_atelier', deletedAt: null },
    include: { departments: { include: { department: true } } },
    orderBy: { name: 'asc' }
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} usuários cadastrados</p>
        </div>
        <Link href="/admin/usuarios/nova"
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm">
          + Nova usuária
        </Link>
      </div>

      <UsuariosTable users={users} />
    </div>
  )
}