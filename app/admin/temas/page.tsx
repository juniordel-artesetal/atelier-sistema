'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Theme {
  id: string
  name: string
  bowColor: string | null
  active: boolean
  createdAt: string
}

const BOW_COLOR_MAP: Record<string, string> = {
  'ROSA': '#f9a8d4', 'ROSA BEBE': '#fbcfe8', 'ROSA BEBÊ': '#fbcfe8',
  'PINK': '#ec4899', 'AZUL': '#60a5fa', 'AZUL BEBE': '#bfdbfe',
  'AZUL BEBÊ': '#bfdbfe', 'AZUL ROYAL': '#1d4ed8', 'VERMELHO': '#ef4444',
  'VERDE': '#22c55e', 'VERDE MUSGO': '#4d7c0f', 'AMARELO': '#facc15',
  'AMARELO OURO': '#d97706', 'LARANJA': '#f97316', 'ROXO': '#a855f7',
  'BRANCO': '#e2e8f0', 'PRETO': '#1e293b', 'DOURADO': '#ca8a04',
  'ROSE': '#fb7185', 'ROSÉ': '#fb7185', 'LILÁS': '#c084fc', 'LILAS': '#c084fc',
}

function ColorDot({ color }: { color: string | null }) {
  if (!color) return null
  const hex = BOW_COLOR_MAP[color.toUpperCase().trim()]
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
      style={{ backgroundColor: hex ?? '#e5e7eb' }}
    />
  )
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"

export default function TemasPage() {
  const { data: session } = useSession()
  const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'DELEGADOR'

  const [themes, setThemes]       = useState<Theme[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterActive, setActive] = useState('true')

  // Form novo tema
  const [showForm, setShowForm]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [newColor, setNewColor]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')

  // Edição
  const [editId, setEditId]       = useState<string | null>(null)
  const [editName, setEditName]   = useState('')
  const [editColor, setEditColor] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/temas')
    const data = await res.json()
    setThemes(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = themes.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.bowColor?.toLowerCase().includes(q)
    const matchActive = filterActive === '' || String(t.active) === filterActive
    return matchSearch && matchActive
  })

  async function handleCreate() {
    if (!newName.trim()) { setFormError('Nome obrigatório'); return }
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch('/api/admin/temas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, bowColor: newColor }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setNewName('')
      setNewColor('')
      setShowForm(false)
      load()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(id: string) {
    setEditSaving(true)
    try {
      await fetch(`/api/admin/temas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, bowColor: editColor }),
      })
      setEditId(null)
      load()
    } finally {
      setEditSaving(false)
    }
  }

  async function handleToggleActive(theme: Theme) {
    await fetch(`/api/admin/temas/${theme.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: theme.name, bowColor: theme.bowColor, active: !theme.active }),
    })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este tema?')) return
    await fetch(`/api/admin/temas/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Temas e Cores</h1>
          <p className="text-gray-500 text-sm mt-1">{themes.length} temas cadastrados</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setShowForm(true); setNewName(''); setNewColor(''); setFormError('') }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg text-sm"
          >
            + Novo tema
          </button>
        )}
      </div>

      {/* FORM NOVO TEMA */}
      {showForm && canManage && (
        <div className="bg-white rounded-xl border border-purple-200 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Novo Tema</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Tema *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Sonic MOD 1"
                className={inputClass}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Cor do Laço</label>
              <div className="flex items-center gap-2">
                <input
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  placeholder="Ex: AZUL ROYAL"
                  className={inputClass}
                />
                {newColor && <ColorDot color={newColor} />}
              </div>
            </div>
          </div>
          {formError && <p className="text-red-500 text-sm mt-2">{formError}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end mb-4">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nome do tema ou cor..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={filterActive} onChange={e => setActive(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
        {(search || filterActive !== 'true') && (
          <button onClick={() => { setSearch(''); setActive('true') }} className="text-sm text-gray-400 hover:text-gray-600 py-2">
            Limpar
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 px-1 mb-3">{filtered.length} de {themes.length} temas</p>

      {/* TABELA */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-gray-500 font-medium">Nenhum tema encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Nome do Tema</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Cor do Laço</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                {canManage && <th className="px-4 py-3 text-left font-semibold text-gray-600">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((theme, i) => (
                <tr key={theme.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3">
                    {editId === theme.id ? (
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="border border-purple-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-full"
                      />
                    ) : (
                      <span className="font-medium text-gray-800">{theme.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editId === theme.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editColor}
                          onChange={e => setEditColor(e.target.value)}
                          placeholder="Ex: ROSA BEBE"
                          className="border border-purple-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-36"
                        />
                        {editColor && <ColorDot color={editColor} />}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ColorDot color={theme.bowColor} />
                        <span className="text-gray-600 text-xs">{theme.bowColor || '—'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <button
                        onClick={() => handleToggleActive(theme)}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          theme.active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {theme.active ? 'Ativo' : 'Inativo'}
                      </button>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${theme.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {theme.active ? 'Ativo' : 'Inativo'}
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {editId === theme.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(theme.id)}
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
                            onClick={() => { setEditId(theme.id); setEditName(theme.name); setEditColor(theme.bowColor ?? '') }}
                            className="text-xs text-purple-600 hover:underline font-medium"
                          >
                            Editar
                          </button>
                          <button onClick={() => handleDelete(theme.id)} className="text-xs text-red-400 hover:underline font-medium">
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
