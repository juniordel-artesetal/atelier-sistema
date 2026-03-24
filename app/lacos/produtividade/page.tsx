'use client'

import { useState, useEffect, useCallback } from 'react'

const BOW_COLORS = [
  'AMARELO BEBE', 'AMARELO OURO', 'AZUL BEBE', 'AZUL ROYAL', 'DOURADO',
  'LARANJA', 'LILAS', 'MARROM', 'PINK', 'PRETO', 'ROSA BEBE', 'ROSE',
  'ROXO', 'VERDE', 'VERDE AGUA', 'VERDE MUSGO', 'VERMELHO',
]

interface EntryItem {
  id: string
  createdAt: string
  bowColor: string
  bowType: string
  quantity: number
  userName: string
  notes: string | null
  responsavel: string | null
  valor: number
}

interface GroupedData {
  responsavel: string
  totalLacos: number
  totalValor: number
  porCor: Record<string, { cor: string; tipo: string; quantidade: number }>
  entries: EntryItem[]
}

interface Operador { id: string; name: string }

const BOW_TYPE_LABEL: Record<string, string> = {
  SIMPLE: 'Simples', LUXURY: 'Luxo', NONE: 'Sem tipo',
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ProdutividadeLacosPage() {
  const [data, setData]       = useState<GroupedData[]>([])
  const [loading, setLoading] = useState(false)
  const [operadores, setOps]  = useState<Operador[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [userId,   setUserId]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [bowColor, setBowColor] = useState('')
  const [bowType,  setBowType]  = useState('')

  useEffect(() => {
    fetch('/api/admin/usuarios').then(r => r.json()).then(users =>
      setOps(users.map((u: any) => ({ id: u.id, name: u.name })))
    ).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (userId)   params.set('userId',   userId)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo)   params.set('dateTo',   dateTo)
    if (bowColor) params.set('bowColor', bowColor)
    if (bowType)  params.set('bowType',  bowType)
    const res  = await fetch(`/api/lacos/produtividade?${params}`)
    const json = await res.json()
    setData(Array.isArray(json) ? json : [])
    setLoading(false)
  }, [userId, dateFrom, dateTo, bowColor, bowType])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const totalGeralLacos = data.reduce((s, d) => s + d.totalLacos, 0)
  const totalValorGeral  = data.reduce((s, d) => s + d.totalValor, 0)

  const inputClass = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Produtividade de Laços</h1>
        <p className="text-gray-500 text-sm mt-1">Produção lançada por responsável no período</p>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Responsável</label>
          <select value={userId} onChange={e => setUserId(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            {operadores.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data início</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data fim</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cor do Laço</label>
          <select value={bowColor} onChange={e => setBowColor(e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            {BOW_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
          <select value={bowType} onChange={e => setBowType(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="SIMPLE">Simples</option>
            <option value="LUXURY">Luxo</option>
          </select>
        </div>
        {(userId || dateFrom || dateTo || bowColor || bowType) && (
          <button
            onClick={() => { setUserId(''); setDateFrom(''); setDateTo(''); setBowColor(''); setBowType('') }}
            className="text-sm text-gray-400 hover:text-gray-600 py-2"
          >
            Limpar
          </button>
        )}
        <button
          onClick={load}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {loading ? 'Buscando...' : 'Pesquisar'}
        </button>
      </div>

      {/* CARD RESUMO */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-pink-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Total de laços produzidos</p>
            <p className="text-3xl font-bold text-pink-600">{totalGeralLacos}</p>
            <p className="text-xs text-gray-400 mt-1">no período filtrado</p>
          </div>
          <div className="bg-white rounded-xl border border-purple-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Responsáveis ativos</p>
            <p className="text-3xl font-bold text-purple-600">{data.length}</p>
            <p className="text-xs text-gray-400 mt-1">com lançamentos no período</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Total a pagar</p>
            <p className="text-2xl font-bold text-emerald-600">{formatBRL(totalValorGeral)}</p>
            <p className="text-xs text-gray-400 mt-1">R$0,20 por laço produzido</p>
          </div>
        </div>
      )}

      {/* LISTA */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Carregando...
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-3xl mb-2">🎀</p>
          <p className="text-gray-500 font-medium">Nenhum lançamento encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(op => {
            const key        = op.responsavel
            const isExpanded = expanded.has(key)
            const coresLista = Object.values(op.porCor)

            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {op.responsavel[0]}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{op.responsavel}</p>
                      <p className="text-xs text-gray-400">{op.entries.length} lançamentos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-pink-600">{op.totalLacos}</p>
                      <p className="text-xs text-gray-400">laços produzidos</p>
                    </div>
                      {op.totalValor > 0 && (
                        <div className="border-l border-gray-100 pl-4 text-right">
                          <p className="text-xl font-bold text-emerald-600">{formatBRL(op.totalValor)}</p>
                          <p className="text-xs text-gray-400">a pagar</p>
                        </div>
                      )}
                    <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Resumo por cor */}
                    <div className="px-5 py-3 bg-gray-50 flex flex-wrap gap-3 border-b border-gray-100">
                      {coresLista.map(c => (
                        <div key={`${c.cor}__${c.tipo}`} className="flex items-center gap-1.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-medium">
                            {c.cor} — {BOW_TYPE_LABEL[c.tipo] ?? c.tipo}
                          </span>
                          <span className="text-sm font-bold text-gray-800">{c.quantidade}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tabela de lançamentos */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Data</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Cor</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Tipo</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-pink-600">Qtd</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Lançado por</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Obs</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-emerald-600">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {op.entries.map((entry, i) => (
                          <tr key={entry.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                            <td className="px-4 py-2 text-xs text-gray-500">
                              {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-4 py-2 text-xs font-medium text-gray-700">{entry.bowColor}</td>
                            <td className="px-4 py-2 text-xs text-gray-600">
                              {BOW_TYPE_LABEL[entry.bowType] ?? entry.bowType}
                            </td>
                            <td className="px-4 py-2 text-center font-bold text-pink-600">{entry.quantity}</td>
                            <td className="px-4 py-2 text-xs text-gray-500">{entry.userName}</td>
                            <td className="px-4 py-2 text-xs text-gray-400">{entry.notes || '—'}</td>
                            <td className="px-4 py-2 text-right text-xs font-semibold text-emerald-600">{formatBRL(entry.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                          <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-emerald-700 text-right">
                            Total a pagar:
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-emerald-700">
                            {formatBRL(op.totalValor)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
