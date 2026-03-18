'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Department { id: string; name: string }
interface UserDept { department: Department }
interface User {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  departments: UserDept[]
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador', DELEGADOR: 'Delegador', OPERADOR: 'Operadora',
}
const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  DELEGADOR: 'bg-blue-100 text-blue-700',
  OPERADOR: 'bg-green-100 text-green-700',
}

const ALL_DEPARTMENTS = [
  { id: 'dep_arte',      name: 'Arte' },
  { id: 'dep_arquivo',   name: 'Arquivo de Impressão' },
  { id: 'dep_impressao', name: 'Impressão' },
  { id: 'dep_prod_ext',  name: 'Produção Externa' },
  { id: 'dep_prod_int',  name: 'Produção Interna' },
  { id: 'dep_pronta',    name: 'Pronta Entrega' },
  { id: 'dep_expedicao', name: 'Expedição' },
]

export default function UsuariosTable({ users }: { users: User[] }) {
  const router = useRouter()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OPERADOR' })
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function openEdit(user: User) {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role })
    setSelectedDepts(user.departments.map(d => d.department.id))
    setError('')
  }

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleDept(id: string) {
    setSelectedDepts(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/usuarios/${editingUser!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, departmentIds: selectedDepts }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }
      setEditingUser(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(user: User) {
    await fetch(`/api/admin/usuarios/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name, email: user.email, role: user.role,
        departmentIds: user.departments.map(d => d.department.id),
        active: !user.active
      }),
    })
    router.refresh()
  }

  async function handleDelete(user: User) {
    if (!confirm(`Excluir ${user.name}?`)) return
    await fetch(`/api/admin/usuarios/${user.id}`, { method: 'DELETE' })
    router.refresh()
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Nome</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Perfil</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Setores</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLOR[user.role]}`}>
                    {ROLE_LABEL[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.departments.length === 0 && <span className="text-gray-300 text-xs">—</span>}
                    {user.departments.map(d => (
                      <span key={d.department.id} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                        {d.department.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleActive(user)}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      user.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(user)} className="text-xs text-purple-600 hover:underline font-medium">Editar</button>
                    <button onClick={() => handleDelete(user)} className="text-xs text-red-400 hover:underline font-medium">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL EDIÇÃO */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Editar usuária</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nome</label>
                <input name="name" value={form.name} onChange={handle} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <input name="email" value={form.email} onChange={handle} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nova senha (deixe em branco para manter)</label>
                <input name="password" type="password" value={form.password} onChange={handle} className={inputClass} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Perfil</label>
                <select name="role" value={form.role} onChange={handle} className={inputClass}>
                  <option value="ADMIN">Administrador</option>
                  <option value="DELEGADOR">Delegador</option>
                  <option value="OPERADOR">Operadora</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Setores</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_DEPARTMENTS.map(dept => (
                    <label key={dept.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        selectedDepts.includes(dept.id)
                          ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      <input
                        type="checkbox"
                        checked={selectedDepts.includes(dept.id)}
                        onChange={() => toggleDept(dept.id)}
                        className="accent-purple-600"
                      />
                      {dept.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingUser(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}