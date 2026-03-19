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
  const [tab, setTab]         = useState<'estoque' | 'lancar' | 'historico'>('lancar')

  // Form lançamento
  const [form, setForm]       = useState({ bowColor: '', bowType: 'SIMPLE', quantity: '', notes: '', responsavel: '' })
  const [filterHist, setFilterHist] = useState({ operador: '', responsavel: '', bowColor: '', bowType: '', dataInicio: '', dataFim: '' })
  const [operadores, setOperadores] = useState<{id: string, name: string}[]>([])
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const [s, e] = await Promise.all([
        fetch('/api/lacos/estoque').then(r => r.json()).catch(() => []),
        fetch('/api/lacos/entradas').then(r => r.json()).catch(() => []),
      ])
      setStocks(Array.isArray(s) ? s : [])
      setEntries(Array.isArray(e) ? e : [])
      const ops = await fetch('/api/admin/usuarios').then(r => r.json()).catch(() => [])
      const opsAtivos = Array.isArray(ops) ? ops.filter((u: any) => u.active && !u.deletedAt) : []
      setOperadores(opsAtivos)
    } catch {
      setStocks([])
      setEntries([])
    } finally {
      setLoading(false)
    }
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
          bowColor:    form.bowColor.trim().toUpperCase(),
          bowType:     form.bowType,
          quantity:    Number(form.quantity),
          notes:       form.notes || null,
          responsavel: form.responsavel || null,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`${form.quantity} laços ${form.bowType === 'SIMPLE' ? 'Simples' : 'Luxo'} ${form.bowColor.toUpperCase()} adicionados ao estoque!`)
      setForm({ bowColor: '', bowType: 'SIMPLE', quantity: '', notes: '', responsavel: '' })
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
      {lowStocks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-semibold text-sm mb-3">
            Alerta: repor estoque das seguintes cores
          </p>
          <div className="space-y-2">
            {lowStocks.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-red-100">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOW_TYPE_COLOR[s.bowType]}`}>
                    {BOW_TYPE_LABEL[s.bowType]}
                  </span>
                  <span className="font-medium text-gray-800 text-sm">{s.bowColor}</span>
                </div>
                <div className="text-right">
                  <span className="text-red-600 font-bold">{s.quantity} unid.</span>
                  <p className="text-xs text-red-400">Repor estoque de laco {s.bowColor} {BOW_TYPE_LABEL[s.bowType]}</p>
                </div>
              </div>
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
                <label className="block text-sm font-medium text-gray-600 mb-1">Cor do Laco *</label>
                <select
                  value={form.bowColor}
                  onChange={e => setForm(p => ({ ...p, bowColor: e.target.value }))}
                  className={inputClass}
                  required
                >
                  <option value="">Selecione a cor...</option>
                  <optgroup label="Amarelo">
                    <option value="AMARELO BEBE">Amarelo Bebe</option>
                    <option value="AMARELO OURO">Amarelo Ouro</option>
                  </optgroup>
                  <optgroup label="Azul">
                    <option value="AZUL BEBE">Azul Bebe</option>
                    <option value="AZUL ROYAL">Azul Royal</option>
                  </optgroup>
                  <optgroup label="Rosa / Pink">
                    <option value="PINK">Pink</option>
                    <option value="ROSA BEBE">Rosa Bebe</option>
                    <option value="ROSE">Rose</option>
                  </optgroup>
                  <optgroup label="Verde">
                    <option value="VERDE">Verde</option>
                    <option value="VERDE AGUA">Verde Agua</option>
                    <option value="VERDE MUSGO">Verde Musgo</option>
                  </optgroup>
                  <optgroup label="Outras cores">
                    <option value="DOURADO">Dourado</option>
                    <option value="LARANJA">Laranja</option>
                    <option value="LILAS">Lilas</option>
                    <option value="MARROM">Marrom</option>
                    <option value="PRETO">Preto</option>
                    <option value="ROXO">Roxo</option>
                    <option value="VERMELHO">Vermelho</option>
                  </optgroup>
                </select>
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
                <label className="block text-sm font-medium text-gray-600 mb-1">Responsável pela Produção</label>
                <select
                  value={form.responsavel}
                  onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Selecione...</option>
                  {operadores.map(op => (
                    <option key={op.id} value={op.name}>{op.name}</option>
                  ))}
                </select>
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
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Operadora (lançou)</label>
              <select value={filterHist.operador} onChange={e => setFilterHist(p => ({ ...p, operador: e.target.value }))} className={inputClass}>
                <option value="">Todas</option>
                {[...new Set(entries.map(e => e.userName))].sort().map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Resp. Producao</label>
              <select value={filterHist.responsavel} onChange={e => setFilterHist(p => ({ ...p, responsavel: e.target.value }))} className={inputClass}>
                <option value="">Todos</option>
                {[...new Set(entries.map(e => (e as any).responsavel).filter(Boolean))].sort().map((n: string) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cor</label>
              <select value={filterHist.bowColor} onChange={e => setFilterHist(p => ({ ...p, bowColor: e.target.value }))} className={inputClass}>
                <option value="">Todas</option>
                {[...new Set(entries.map(e => e.bowColor))].sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select value={filterHist.bowType} onChange={e => setFilterHist(p => ({ ...p, bowType: e.target.value }))} className={inputClass}>
                <option value="">Todos</option>
                <option value="SIMPLE">Simples</option>
                <option value="LUXURY">Luxo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data inicio</label>
              <input type="date" value={filterHist.dataInicio} onChange={e => setFilterHist(p => ({ ...p, dataInicio: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data fim</label>
              <input type="date" value={filterHist.dataFim} onChange={e => setFilterHist(p => ({ ...p, dataFim: e.target.value }))} className={inputClass} />
            </div>
            {(filterHist.operador || filterHist.responsavel || filterHist.bowColor || filterHist.bowType || filterHist.dataInicio || filterHist.dataFim) && (
              <button onClick={() => setFilterHist({ operador: '', responsavel: '', bowColor: '', bowType: '', dataInicio: '', dataFim: '' })}
                className="text-sm text-gray-400 hover:text-gray-600 px-2 py-2">
                Limpar
              </button>
            )}
          </div>

          {(() => {
            const filteredEntries = entries.filter(e => {
              if (filterHist.operador && e.userName !== filterHist.operador) return false
              if (filterHist.responsavel && (e as any).responsavel !== filterHist.responsavel) return false
              if (filterHist.bowColor && e.bowColor !== filterHist.bowColor) return false
              if (filterHist.bowType && e.bowType !== filterHist.bowType) return false
              if (filterHist.dataInicio) {
                const d = e.createdAt.includes('T') ? e.createdAt.split('T')[0] : e.createdAt
                if (d < filterHist.dataInicio) return false
              }
              if (filterHist.dataFim) {
                const d = e.createdAt.includes('T') ? e.createdAt.split('T')[0] : e.createdAt
                if (d > filterHist.dataFim) return false
              }
              return true
            })
            const totalFiltrado = filteredEntries.reduce((s, e) => s + e.quantity, 0)

            // Totais por responsável
            const totaisPorResp: Record<string, number> = {}
            filteredEntries.forEach(e => {
              const key = (e as any).responsavel || 'Sem responsavel'
              totaisPorResp[key] = (totaisPorResp[key] || 0) + e.quantity
            })

            return (
              <div className="space-y-4">
                {/* Cards de totais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <p className="text-xs text-purple-500 font-medium">Total filtrado</p>
                    <p className="text-2xl font-bold text-purple-700">{totalFiltrado}</p>
                    <p className="text-xs text-purple-400">lacos</p>
                  </div>
                  {Object.entries(totaisPorResp).map(([resp, qty]) => (
                    <div key={resp} className="bg-white rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium truncate">{resp}</p>
                      <p className="text-2xl font-bold text-blue-600">{qty}</p>
                      <p className="text-xs text-gray-400">lacos produzidos</p>
                    </div>
                  ))}
                </div>

                {loading ? (
                  <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">Carregando...</div>
                ) : filteredEntries.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">Nenhum lancamento encontrado.</div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Data</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Operadora</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Resp. Producao</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Cor</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-600">Qtd</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Obs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map((e, i) => (
                          <tr key={e.id} className={"border-b border-gray-50 " + (i % 2 === 0 ? '' : 'bg-gray-50/50')}>
                            <td className="px-4 py-3 text-xs text-gray-500">{formatDate(e.createdAt)}</td>
                            <td className="px-4 py-3 font-medium text-gray-700">{e.userName}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{(e as any).responsavel || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{e.bowColor}</td>
                            <td className="px-4 py-3">
                              <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (BOW_TYPE_COLOR[e.bowType] || '')}>
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
            )
          })()}
        </div>
      )}
    </div>
  )
}
