'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"

const DEPARTMENTS = [
  { id: 'dep_arte',      name: 'Arte' },
  { id: 'dep_arquivo',   name: 'Arquivo de Impressão' },
  { id: 'dep_impressao', name: 'Impressão' },
  { id: 'dep_prod_ext',  name: 'Produção Externa' },
  { id: 'dep_prod_int',  name: 'Produção Interna' },
  { id: 'dep_pronta',    name: 'Pronta Entrega' },
  { id: 'dep_expedicao', name: 'Expedição' },
]

export default function NovaUsuariaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OPERADOR' })
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleDept(id: string) {
    setSelectedDepts(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, departmentIds: selectedDepts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar')
      router.push('/admin/usuarios')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Nova usuária</h1>
        <p className="text-gray-500 text-sm mt-1">Preencha os dados para criar o acesso</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Nome *</label>
          <input name="name" value={form.name} onChange={handle} required className={inputClass} placeholder="Ex: Ana Paula" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Email *</label>
          <input name="email" type="email" value={form.email} onChange={handle} required className={inputClass} placeholder="ana@atelier.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Senha *</label>
          <input name="password" type="password" value={form.password} onChange={handle} required className={inputClass} placeholder="••••••••" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Perfil *</label>
          <select name="role" value={form.role} onChange={handle} className={inputClass}>
            <option value="OPERADOR">Operadora</option>
            <option value="DELEGADOR">Delegador</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        {/* SETORES — checkboxes */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Setores</label>
          <div className="grid grid-cols-2 gap-2">
            {DEPARTMENTS.map(dept => (
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

        {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg hover:bg-gray-50 text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50">
            {loading ? 'Criando...' : 'Criar usuária'}
          </button>
        </div>
      </form>
    </div>
  )
}