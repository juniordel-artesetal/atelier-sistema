'use client'

import { useState, useEffect, useCallback } from 'react'

interface DeptSummary {
  name: string
  deptId: string
  metrica: 'itens' | 'pedidos'
  count: number
  totalItems: number
}

interface TaskItem {
  id: string
  doneAt: string
  department: string
  deptId: string
  metrica: 'itens' | 'pedidos'
  externalId: string | null
  recipientName: string
  totalItems: number
  contabilizado: number
}

interface OperatorData {
  userId: string | null
  userName: string
  departments: Record<string, DeptSummary>
  totalTarefas: number
  totalItens: number
  totalPedidos: number
  items: TaskItem[]
}

interface Operador { id: string; name: string }
interface Department { id: string; name: string }

const SETORES_POR_ITENS = ['dep_prod_ext', 'dep_prod_int', 'dep_pronta']

export default function ProdutividadePage() {
  const [data, setData]         = useState<OperatorData[]>([])
  const [loading, setLoading]   = useState(false)
  const [operadores, setOps]    = useState<Operador[]>([])
  const [departments, setDepts] = useState<Department[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [userId,   setUserId]   = useState('')
  const [deptId,   setDeptId]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [metrica,  setMetrica]  = useState('')   // '' | 'itens' | 'pedidos'
  const [bowType,  setBowType]  = useState('')   // '' | 'SIMPLE' | 'LUXURY' | 'NONE'
  const [produto,  setProduto]  = useState('')
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      // Monta dados para exportação
      const rows: any[] = []
      const filtered = metrica
        ? data.map(op => ({ ...op, items: op.items.filter((i: any) => i.metrica === metrica) }))
            .filter(op => op.items.length > 0)
        : data

      for (const op of filtered) {
        for (const item of op.items) {
          rows.push({
            Operador:      op.userName,
            Data:          new Date(item.doneAt).toLocaleDateString('pt-BR'),
            Setor:         item.department,
            'ID Shopee':   item.externalId ?? '',
            Destinatário:  item.recipientName,
            Quantidade:    item.contabilizado,
            Métrica:       item.metrica === 'itens' ? 'Itens' : 'Pedido',
          })
        }
        // Linha de subtotal por operador
        rows.push({
          Operador:     op.userName,
          Data:         '',
          Setor:        'SUBTOTAL',
          'ID Shopee':  '',
          Destinatário: '',
          Quantidade:   metrica === 'itens' ? op.totalItens : metrica === 'pedidos' ? op.totalPedidos : op.totalItens + op.totalPedidos,
          Métrica:      metrica || 'Total',
        })
        rows.push({}) // linha em branco entre operadores
      }

      // Gerar CSV
      const headers = Object.keys(rows[0] || {})
      const csv = [
        headers.join(';'),
        ...rows.map(r => headers.map(h => {
          const val = (r[h] ?? '').toString().replace(/"/g, '""')
          return '"' + val + '"'
        }).join(';'))
      ].join('\n')

      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `produtividade_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    fetch('/api/admin/usuarios').then(r => r.json()).then(users =>
      setOps(users.map((u: any) => ({ id: u.id, name: u.name })))
    )
    fetch('/api/admin/departamentos').then(r => r.json()).then(setDepts).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (userId)   params.set('userId',   userId)
    if (deptId)   params.set('deptId',   deptId)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo)   params.set('dateTo',   dateTo)
    if (bowType)  params.set('bowType',  bowType)
    if (produto)  params.set('produto',  produto)
    const res  = await fetch(`/api/admin/produtividade?${params}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [userId, deptId, dateFrom, dateTo])

  // Carrega automaticamente só na primeira vez (sem filtros)
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Filtrar dados por métrica
  const dadosFiltrados = metrica
    ? data.map(op => ({ ...op, items: op.items.filter((i: any) => i.metrica === metrica) }))
          .filter(op => op.items.length > 0)
    : data

  // Recalcular totalItens por operador considerando filtro de laço
  const dadosComFiltroLaco = dadosFiltrados.map(op => {
    // Filtrar itens por bowType E produto no frontend
    const produtoLower = produto.toLowerCase().trim()

    const itensFiltrados = op.items.filter((i: any) => {
      const matchBow = !bowType || i.metrica !== 'itens' || (i as any).bowType === bowType
      const matchProd = !produtoLower || (i as any).productName?.toLowerCase().includes(produtoLower)
      return matchBow && matchProd
    })

    const totalItensFiltrado = itensFiltrados
      .filter((i: any) => i.metrica === 'itens')
      .reduce((s: number, i: any) => s + (i.contabilizado ?? 0), 0)

    return { ...op, totalItensFiltrado, itensFiltrados }
  }).filter(op => op.itensFiltrados.length > 0)

  const totalItensGeral   = dadosComFiltroLaco.reduce((s, d) => s + (d.totalItensFiltrado ?? d.totalItens), 0)
  const totalPedidosGeral = dadosComFiltroLaco.reduce((s, d) => s + d.totalPedidos, 0)
  const totalTarefasGeral = dadosComFiltroLaco.reduce((s, d) => s + d.totalTarefas, 0)

  const inputClass = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Produtividade</h1>
        <p className="text-gray-500 text-sm mt-1">
          Prod. Externa / Interna / Pronta Entrega: contabiliza por <strong>itens</strong> · Arte e demais: contabiliza por <strong>pedidos</strong>
        </p>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Operador</label>
          <select value={userId} onChange={e => setUserId(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            {operadores.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Setor</label>
          <select value={deptId} onChange={e => setDeptId(e.target.value)} className={inputClass}>
            <option value="">Todos os setores</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Métrica</label>
          <select value={metrica} onChange={e => setMetrica(e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            <option value="itens">Itens (Prod. Externa)</option>
            <option value="pedidos">Pedidos (Arte e demais)</option>
          </select>
        </div>
        <div className="border-l border-gray-200 pl-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Laço</label>
          <select value={bowType} onChange={e => setBowType(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="NONE">Sem laço</option>
            <option value="SIMPLE">Simples</option>
            <option value="LUXURY">Luxo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Produto</label>
          <input
            value={produto}
            onChange={e => setProduto(e.target.value)}
            placeholder="Ex: Cofrinho, Aplique..."
            className={`${inputClass} w-40`}
          />
        </div>
        {(userId || deptId || dateFrom || dateTo || metrica || bowType || produto) && (
          <button onClick={() => { setUserId(''); setDeptId(''); setDateFrom(''); setDateTo(''); setMetrica(''); setBowType(''); setProduto('') }}
            className="text-sm text-gray-400 hover:text-gray-600 py-2">
            Limpar
          </button>
        )}
        <button
          onClick={load}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Buscando...' : 'Pesquisar'}
        </button>
        <button
          onClick={handleExport}
          disabled={exporting || data.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap"
        >
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {/* CARDS RESUMO GERAL */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-blue-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Itens produzidos</p>
            <p className="text-3xl font-bold text-blue-600">{totalItensGeral}</p>
            <p className="text-xs text-gray-400 mt-1">
              {bowType === 'SIMPLE' ? 'com laço simples'
                : bowType === 'LUXURY' ? 'com laço luxo'
                : bowType === 'NONE'   ? 'sem laço'
                : produto ? `produto: ${produto}`
                : 'Prod. Externa / Interna / Pronta'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-purple-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Pedidos trabalhados</p>
            <p className="text-3xl font-bold text-purple-600">{totalPedidosGeral}</p>
            <p className="text-xs text-gray-400 mt-1">Arte e demais setores</p>
          </div>
          <div className="bg-white rounded-xl border border-green-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Tarefas concluídas</p>
            <p className="text-3xl font-bold text-green-600">{totalTarefasGeral}</p>
            <p className="text-xs text-gray-400 mt-1">total de work items</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Operadores ativos</p>
            <p className="text-3xl font-bold text-gray-700">{data.filter(d => d.userId).length}</p>
            <p className="text-xs text-gray-400 mt-1">com tarefas no período</p>
          </div>
        </div>
      )}

      {/* LISTA POR OPERADOR */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Carregando...
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-gray-500 font-medium">Nenhum dado encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dadosComFiltroLaco.map(op => {
            const key        = op.userId ?? 'sem_responsavel'
            const isExpanded = expanded.has(key)
            const depts      = Object.values(op.departments)

            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {op.userName[0]}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{op.userName}</p>
                      <p className="text-xs text-gray-400">{op.totalTarefas} tarefas concluídas</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex gap-4 text-right">
                      {op.totalItens > 0 && (
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {bowType ? (op as any).totalItensFiltrado ?? 0 : op.totalItens}
                          </p>
                          <p className="text-xs text-gray-400">
                            {bowType === 'SIMPLE' ? 'itens c/ laço simples'
                              : bowType === 'LUXURY' ? 'itens c/ laço luxo'
                              : bowType === 'NONE'   ? 'itens sem laço'
                              : 'itens produzidos'}
                          </p>
                        </div>
                      )}
                      {op.totalPedidos > 0 && (
                        <div>
                          <p className="text-2xl font-bold text-purple-600">{op.totalPedidos}</p>
                          <p className="text-xs text-gray-400">pedidos</p>
                        </div>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="px-5 py-3 bg-gray-50 flex flex-wrap gap-4 border-b border-gray-100">
                      {depts.map(d => (
                        <div key={d.deptId} className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            SETORES_POR_ITENS.includes(d.deptId)
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}>
                            {d.name}
                          </span>
                          <span className="text-sm font-bold text-gray-800">{d.totalItems}</span>
                          <span className="text-xs text-gray-400">
                            {SETORES_POR_ITENS.includes(d.deptId) ? 'itens' : 'pedidos'} ({d.count} tarefas)
                          </span>
                        </div>
                      ))}
                    </div>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Data</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Setor</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">ID Shopee</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Produto</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Destinatário</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Qtd Itens</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Métrica</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-purple-600">Tipo Laço</th>
                          {!bowType && <th className="px-4 py-2 text-center text-xs font-semibold text-purple-600">Qtd Laços</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {((op as any).itensFiltrados ?? op.items).map((item: any, i: number) => (
                          <tr key={item.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                            <td className="px-4 py-2 text-xs text-gray-500">
                              {new Date(item.doneAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-600">{item.department}</td>
                            <td className="px-4 py-2 text-xs font-mono text-gray-400">{item.externalId || '—'}</td>
                            <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate" title={(item as any).productName ?? ''}>
                              {(item as any).productName ? (item as any).productName.split('|')[0].trim() : '—'}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700">{item.recipientName}</td>
                            <td className="px-4 py-2 text-center font-bold text-sm">
                              <span className={item.metrica === 'itens' ? 'text-blue-600' : 'text-purple-600'}>
                                {item.contabilizado}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                item.metrica === 'itens'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-purple-50 text-purple-700'
                              }`}>
                                {item.metrica === 'itens' ? 'itens' : 'pedido'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-xs font-medium text-purple-700">
                              {(item as any).bowType === 'LUXURY' ? 'Luxo'
                                : (item as any).bowType === 'SIMPLE' ? 'Simples'
                                : (item as any).bowType === 'NONE' ? 'Sem laço'
                                : '—'}
                            </td>
                            {!bowType && (
                              <td className="px-4 py-2 text-center font-bold text-purple-600 text-sm">
                                {(item as any).bowQty ?? '—'}
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
          })}
        </div>
      )}
    </div>
  )
}
