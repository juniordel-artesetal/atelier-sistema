'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface BowStock {
  id: string
  bowColor: string
  bowType: string
  quantity: number
  updatedAt: string
}

interface BowEntry {
  id: string
  bowColor: string
  bowType: string
  quantity: number
  userName: string
  notes: string | null
  createdAt: string
}

const BOW_TYPE_LABEL: Record<string, string> = {
  SIMPLE: 'Simples', LUXURY: 'Luxo',
}
const BOW_TYPE_COLOR: Record<string, string> = {
  SIMPLE: 'bg-pink-50 text-pink-700',
  LUXURY: 'bg-purple-50 text-purple-700',
}

const LOW_THRESHOLD = 40

export default function EstoqueLacosPage() {
  const { data: session } = useSession()
  const role      = session?.user?.role
  const canManage = role === 'ADMIN' || role === 'DELEGADOR'

  const [stocks, setStocks]   = useState<BowStock[]>([])
  const [entries, setEntries] = useState<BowEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'estoque' | 'lancar' | 'historico'>('estoque')

  // Form lançamento
  const [form, setForm]       = useState({ bowColor: '', bowType: 'SIMPLE', quantity: '', notes: '' })
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')

  async function loadData() {
    setLoading(true)
    const [s, e] = await Promise.all([
      fetch('/api/lacos/estoque').then(r => r.json()),
      fetch('/api/lacos/entradas').then(r => r.json()),
    ])
    setStocks(s)
    setEntries(e)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleLancar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.bowColor.trim() || !form.quantity) {
      setError('Cor e quantidade são obrigatórios')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/lacos/estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bowColor:  form.bowColor.trim().toUpperCase(),
          bowType:   form.bowType,
          quantity:  Number(form.quantity),
          notes:     form.notes || null,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`${form.quantity} laços ${form.bowType === 'SIMPLE' ? 'Simples' : 'Luxo'} ${form.bowColor.toUpperCase()} adicionados ao estoque!`)
      setForm({ bowColor: '', bowType: 'SIMPLE', quantity: '', notes: '' })
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"

  const lowStocks  = stocks.filter(s => s.quantity <= LOW_THRESHOLD)
  const goodStocks = stocks.filter(s => s.quantity > LOW_THRESHOLD)

  function formatDate(d: string) {
    if (!d) return '—'
    const dt = new Date(d)
    return dt.getUTCDate().toString().padStart(2,'0') + '/' +
           (dt.getUTCMonth()+1).toString().padStart(2,'0') + '/' +
           dt.getUTCFullYear() + ' ' +
           dt.getUTCHours().toString().padStart(2,'0') + ':' +
           dt.getUTCMinutes().toString().padStart(2,'0')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Estoque de Laços</h1>
        <p className="text-gray-500 text-sm mt-1">Controle de produção e estoque por cor e tipo</p>
      </div>

      {/* Alertas de estoque baixo */}
      {canManage && lowStocks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600 font-semibold text-sm">Estoque baixo (abaixo de {LOW_THRESHOLD} unidades)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStocks.map(s => (
              <span key={s.id} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                {s.bowColor} {BOW_TYPE_LABEL[s.bowType]} — {s.quantity} unid.
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'estoque',   label: 'Estoque Atual' },
          { key: 'lancar',    label: 'Lançar Produção' },
          { key: 'historico', label: 'Histórico', admin: false },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ABA ESTOQUE */}
      {tab === 'estoque' && (
        <div>
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">Carregando...</div>
          ) : stocks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-500">Nenhum laço em estoque ainda.</p>
              <p className="text-sm text-gray-400 mt-1">Lance a primeira produção na aba "Lançar Produção".</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Estoque baixo */}
              {lowStocks.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-red-500 uppercase mb-2">Estoque Baixo</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {lowStocks.map(s => (
                      <div key={s.id} className="bg-white rounded-xl border border-red-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOW_TYPE_COLOR[s.bowType]}`}>
                            {BOW_TYPE_LABEL[s.bowType]}
                          </span>
                          <span className="text-xs text-red-400 font-medium">Baixo</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">{s.bowColor}</p>
                        <p className="text-2xl font-bold text-red-500 mt-1">{s.quantity}</p>
                        <p className="text-xs text-gray-400">unidades</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estoque normal */}
              {goodStocks.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Estoque Normal</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {goodStocks.map(s => (
                      <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOW_TYPE_COLOR[s.bowType]}`}>
                            {BOW_TYPE_LABEL[s.bowType]}
                          </span>
                          <span className="text-xs text-green-500 font-medium">OK</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">{s.bowColor}</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{s.quantity}</p>
                        <p className="text-xs text-gray-400">unidades</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA LANÇAR */}
      {tab === 'lancar' && (
        <div className="max-w-md">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-700 mb-4">Lançar Produção de Laços</h2>
            <form onSubmit={handleLancar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Cor do Laço *</label>
                <input
                  value={form.bowColor}
                  onChange={e => setForm(p => ({ ...p, bowColor: e.target.value }))}
                  placeholder="Ex: ROSA BEBE, AZUL ROYAL..."
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tipo *</label>
                <select
                  value={form.bowType}
                  onChange={e => setForm(p => ({ ...p, bowType: e.target.value }))}
                  className={inputClass}
                >
                  <option value="SIMPLE">Simples</option>
                  <option value="LUXURY">Luxo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Quantidade Produzida *</label>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="Ex: 50"
                  className={`${inputClass} font-bold text-blue-600`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Observação</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Opcional"
                  className={inputClass}
                />
              </div>

              {error   && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              {success && <p className="text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Lançando...' : 'Confirmar Produção'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ABA HISTÓRICO */}
      {tab === 'historico' && (
        <div>
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">Carregando...</div>
          ) : entries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
              Nenhum lançamento ainda.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Data</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Operadora</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Cor</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Qtd</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(e.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{e.userName}</td>
                      <td className="px-4 py-3 text-gray-600">{e.bowColor}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOW_TYPE_COLOR[e.bowType]}`}>
                          {BOW_TYPE_LABEL[e.bowType]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{e.quantity}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{e.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
