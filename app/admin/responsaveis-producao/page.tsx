'use client'

import { useState, useEffect } from 'react'

interface Responsavel {
  id: string
  name: string
  active: boolean
  createdAt: string
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"

export default function ResponsaveisProducaoPage() {
  const [list, setList]         = useState<Responsavel[]>([])
  const [loading, setLoading]   = useState(true)
  const [newName, setNewName]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [editId, setEditId]     = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [search, setSearch]     = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/responsaveis-producao')
    setList(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = list.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate() {
    if (!newName.trim()) { setError('Nome obrigatório'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/responsaveis-producao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setNewName('')
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(id: string) {
    setEditSaving(true)
    try {
      await fetch(`/api/admin/responsaveis-producao/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })
      setEditId(null)
      load()
    } finally {
      setEditSaving(false)
    }
  }

  async function handleToggle(r: Responsavel) {
    await fetch(`/api/admin/responsaveis-producao/${r.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: r.name, active: !r.active }),
    })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este responsável?')) return
    await fetch(`/api/admin/responsaveis-producao/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Responsáveis pela Produção</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cadastro de freelancers e responsáveis externos de produção
        </p>
      </div>

      {/* FORM NOVO */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Novo responsável</h2>
        <div className="flex gap-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ex: Débora, Carol, Ana..."
            className={inputClass}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? 'Salvando...' : '+ Adicionar'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* FILTRO */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white w-full max-w-xs"
        />
      </div>

      <p className="text-xs text-gray-400 px-1 mb-3">{filtered.length} de {list.length} responsáveis</p>

      {/* LISTA */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Carregando...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    Nenhum responsável cadastrado.
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3">
                    {editId === r.id ? (
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="border border-purple-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-48"
                      />
                    ) : (
                      <span className="font-medium text-gray-800">{r.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(r)}
                      className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                        r.active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {r.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {editId === r.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(r.id)}
                          disabled={editSaving}
                          className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {editSaving ? '...' : 'Salvar'}
                        </button>
                        <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditId(r.id); setEditName(r.name) }}
                          className="text-xs text-purple-600 hover:underline font-medium"
                        >
                          Editar
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:underline font-medium">
                          Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
