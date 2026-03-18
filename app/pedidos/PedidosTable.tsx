'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface OrderItem {
  productName: string
  theme: string | null
  childName: string | null
  bowColor: string | null
  bowType: string | null
  bowQty: number | null
  appliqueType: string | null
  appliqueQty: number | null
  totalItems: number | null
}

interface Order {
  id: string
  externalId: string | null
  buyerUsername: string | null
  recipientName: string
  status: string
  theme: string | null
  artType: string | null
  artStatus: string | null
  dueDate: string | null
  createdAt: string
  store: { name: string } | null
  items: OrderItem[]
  workItems: { step: { name: string } | null }[]
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:     'Aguardando',
  IN_PROGRESS: 'Em produção',
  DONE:        'Concluído',
  POSTED:      'Enviado',
  CANCELLED:   'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING:     'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE:        'bg-green-100 text-green-700',
  POSTED:      'bg-teal-100 text-teal-700',
  CANCELLED:   'bg-red-100 text-red-600',
}
const ART_STATUS_LABEL: Record<string, string> = {
  APROVADO: 'Aprovado', ARTE_IGUAL: 'Arte Igual',
  ARTE_CLIENTE: 'Arte Cliente', PRODUZIDO_SEM_APROVACAO: 'Prod. s/ Aprov.',
}
const ART_STATUS_COLOR: Record<string, string> = {
  APROVADO:               'bg-green-100 text-green-700',
  ARTE_IGUAL:             'bg-blue-100 text-blue-700',
  ARTE_CLIENTE:           'bg-yellow-100 text-yellow-700',
  PRODUZIDO_SEM_APROVACAO:'bg-red-100 text-red-600',
}

const BOW_LABEL: Record<string, string> = {
  NONE: '—', SIMPLE: 'Simples', LUXURY: 'Luxo',
}
const APPLIQUE_LABEL: Record<string, string> = {
  NONE: '—', SIMPLE: 'Simples', THREE_D: '3D', THREE_D_LUX: '3D Luxo',
}

// Mapa de cores conhecidas para exibição visual
const BOW_COLOR_MAP: Record<string, string> = {
  'ROSA':          '#f9a8d4',
  'ROSA BEBE':     '#fbcfe8',
  'ROSA BEBÊ':     '#fbcfe8',
  'PINK':          '#ec4899',
  'AZUL':          '#60a5fa',
  'AZUL BEBE':     '#bfdbfe',
  'AZUL BEBÊ':     '#bfdbfe',
  'AZUL ROYAL':    '#1d4ed8',
  'VERMELHO':      '#ef4444',
  'VERDE':         '#22c55e',
  'VERDE MUSGO':   '#4d7c0f',
  'AMARELO':       '#facc15',
  'AMARELO OURO':  '#d97706',
  'LARANJA':       '#f97316',
  'ROXO':          '#a855f7',
  'BRANCO':        '#f1f5f9',
  'PRETO':         '#1e293b',
  'DOURADO':       '#ca8a04',
  'ROSE':          '#fb7185',
  'ROSÉ':          '#fb7185',
  'LILÁS':         '#c084fc',
  'LILAS':         '#c084fc',
}

function BowColorDot({ color }: { color: string | null }) {
  if (!color) return <span className="text-gray-300 text-xs">—</span>
  const upper = color.toUpperCase().trim()
  const hex = BOW_COLOR_MAP[upper]
  return (
    <div className="flex items-center gap-1.5">
      {hex ? (
        <span
          className="w-3 h-3 rounded-full inline-block border border-gray-200 flex-shrink-0"
          style={{ backgroundColor: hex }}
        />
      ) : (
        <span className="w-3 h-3 rounded-full inline-block border border-gray-300 bg-gray-100 flex-shrink-0" />
      )}
      <span className="text-xs text-gray-600">{color}</span>
    </div>
  )
}

export default function PedidosTable({ orders, initialStatus = '' }: { orders: Order[], initialStatus?: string }) {
  const router = useRouter()

  const [search, setSearch]         = useState('')
  const [filterStatus, setStatus]   = useState(initialStatus)
  const [filterDataEnvio, setEnvio] = useState('')
  const [filterEntrada, setEntrada] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return orders.filter(order => {
      const item = order.items[0]
      if (q) {
        const match =
          order.externalId?.toLowerCase().includes(q)       ||
          order.buyerUsername?.toLowerCase().includes(q)    ||
          order.recipientName.toLowerCase().includes(q)     ||
          item?.theme?.toLowerCase().includes(q)            ||
          item?.childName?.toLowerCase().includes(q)        ||
          item?.productName?.toLowerCase().includes(q)      ||
          item?.bowColor?.toLowerCase().includes(q)            ||
          order.artType?.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filterStatus && order.status !== filterStatus) return false
      if (filterDataEnvio && order.dueDate) {
        const envio = new Date(order.dueDate).toISOString().split('T')[0]
        if (envio !== filterDataEnvio) return false
      }
      if (filterEntrada) {
        const entrada = new Date(order.createdAt).toISOString().split('T')[0]
        if (entrada !== filterEntrada) return false
      }
      return true
    })
  }, [orders, search, filterStatus, filterDataEnvio, filterEntrada])

  const inputClass = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"

  const { data: session } = useSession()
  const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'DELEGADOR'

  // ── Seleção em massa ──────────────────────────────────────────────────────
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading]     = useState(false)
  const [bulkStatus, setBulkStatus]       = useState('')
  const [bulkProdType, setBulkProdType]   = useState('')
  const [bulkBowColor, setBulkBowColor]   = useState('')
  const [bulkBowType, setBulkBowType]     = useState('')

  const allFilteredIds = filtered.map(o => o.id)
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected   = selected.size > 0

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        allFilteredIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        allFilteredIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  const bulkAction = useCallback(async (action: string, payload?: any) => {
    const orderIds = Array.from(selected)
    if (orderIds.length === 0) return
    if (action === 'delete' && !confirm(`Excluir ${orderIds.length} pedido(s)? Esta ação não pode ser desfeita.`)) return
    setBulkLoading(true)
    try {
      const res = await fetch('/api/orders/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, orderIds, payload }),
      })
      if (!res.ok) throw new Error()
      setSelected(new Set())
      setBulkStatus('')
      setBulkProdType('')
      setBulkBowColor('')
      setBulkBowType('')
      router.refresh()
    } catch {
      alert('Erro ao executar ação em massa.')
    } finally {
      setBulkLoading(false)
    }
  }, [selected, router])

  return (
    <div className="space-y-4">

      {/* BARRA DE BUSCA */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ID Shopee, nome, tema, produto, cor laço..."
            className={`${inputClass} w-full`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={filterStatus} onChange={e => setStatus(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="PENDING">Aguardando</option>
            <option value="IN_PROGRESS">Em produção</option>
            <option value="DONE">Concluído</option>
            <option value="POSTED">Enviado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data de entrada</label>
          <input type="date" value={filterEntrada} onChange={e => setEntrada(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data de envio</label>
          <input type="date" value={filterDataEnvio} onChange={e => setEnvio(e.target.value)} className={inputClass} />
        </div>
        {(search || filterStatus || filterDataEnvio || filterEntrada) && (
          <button
            onClick={() => { setSearch(''); setStatus(''); setEnvio(''); setEntrada('') }}
            className="text-sm text-gray-400 hover:text-gray-600 px-2 py-2"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* CONTADOR */}
      <p className="text-xs text-gray-400 px-1">
        {filtered.length} de {orders.length} pedidos
      </p>

      {/* TABELA */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-gray-500 font-medium">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <>
        {/* BARRA DE AÇÕES EM MASSA */}
        {canManage && someSelected && (
          <div className="bg-gray-100 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
            <span className="text-sm font-semibold">
              {selected.size} pedido(s) selecionado(s)
            </span>

            {/* Alterar status */}
            <div className="flex items-center gap-2">
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none"
              >
                <option value="">Alterar status...</option>
                <option value="PENDING">Aguardando</option>
                <option value="IN_PROGRESS">Em produção</option>
                <option value="DONE">Concluído</option>
                <option value="POSTED">Enviado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
              {bulkStatus && (
                <button
                  onClick={() => bulkAction('status', { status: bulkStatus })}
                  disabled={bulkLoading}
                  className="bg-white border border-gray-300 text-gray-700 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {bulkLoading ? '...' : 'Aplicar'}
                </button>
              )}
            </div>

            {/* Alterar tipo de produção */}
            <div className="flex items-center gap-2">
              <select
                value={bulkProdType}
                onChange={e => setBulkProdType(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none"
              >
                <option value="">Tipo de produção...</option>
                <option value="EXTERNA">Externa</option>
                <option value="INTERNA">Interna</option>
                <option value="PRONTA_ENTREGA">Pronta Entrega</option>
              </select>
              {bulkProdType && (
                <button
                  onClick={() => bulkAction('productionType', { productionType: bulkProdType })}
                  disabled={bulkLoading}
                  className="bg-white border border-gray-300 text-gray-700 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {bulkLoading ? '...' : 'Aplicar'}
                </button>
              )}
            </div>

            {/* Cor do laço */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={bulkBowColor}
                onChange={e => setBulkBowColor(e.target.value)}
                placeholder="Cor do laço..."
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none w-32"
              />
              {bulkBowColor && (
                <button
                  onClick={() => bulkAction('bowColor', { bowColor: bulkBowColor })}
                  disabled={bulkLoading}
                  className="bg-white border border-gray-300 text-gray-700 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {bulkLoading ? '...' : 'Aplicar'}
                </button>
              )}
            </div>

            {/* Tipo do laço */}
            <div className="flex items-center gap-2">
              <select
                value={bulkBowType}
                onChange={e => setBulkBowType(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none"
              >
                <option value="">Tipo de laço...</option>
                <option value="NONE">Sem laço</option>
                <option value="SIMPLE">Simples</option>
                <option value="LUXURY">Luxo</option>
              </select>
              {bulkBowType && (
                <button
                  onClick={() => bulkAction('bowType', { bowType: bulkBowType })}
                  disabled={bulkLoading}
                  className="bg-white border border-gray-300 text-gray-700 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {bulkLoading ? '...' : 'Aplicar'}
                </button>
              )}
            </div>

            {/* Excluir */}
            <button
              onClick={() => bulkAction('delete')}
              disabled={bulkLoading}
              className="ml-auto bg-red-500 hover:bg-red-600 text-white font-semibold text-xs px-4 py-1.5 rounded-lg disabled:opacity-50"
            >
              {bulkLoading ? '...' : 'Excluir selecionados'}
            </button>

            <button
              onClick={() => setSelected(new Set())}
              className="text-gray-400 hover:text-gray-700 text-xs"
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {canManage && (
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="accent-purple-600 w-4 h-4 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">ID Shopee</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">ID User</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Destinatário</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Produto</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Tema</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Criança</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Tipo Produção</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Tipo Arte</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Status Arte</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Cor Laço</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Tipo Laço</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">Qtd Laço</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Aplique</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">Qtd Aplique</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">Qtd Itens</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Loja</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Setor</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Data Envio</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Data Entrada</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const item  = order.items[0]
                const setor = order.workItems[0]?.step?.name ?? null

                return (
                  <tr
                    key={order.id}
                    className={`border-b border-gray-50 hover:bg-purple-50 transition-colors ${selected.has(order.id) ? 'bg-purple-50' : ''}`}
                  >
                    {canManage && (
                      <td className="px-3 py-3 w-8" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(order.id)}
                          onChange={() => toggleOne(order.id)}
                          className="accent-purple-600 w-4 h-4 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3 text-gray-400 text-xs font-mono whitespace-nowrap cursor-pointer" onClick={() => router.push(`/pedidos/${order.id}/editar`)}>
                      {order.externalId || '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {order.buyerUsername || '—'}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap cursor-pointer" onClick={() => router.push(`/pedidos/${order.id}/editar`)}>
                      {order.recipientName}
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs max-w-[160px] truncate" title={item?.productName}>
                      {item?.productName || '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {order.theme || '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {item?.childName || '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {order.productionType ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                          {order.productionType === 'EXTERNA' ? 'Externa'
                            : order.productionType === 'INTERNA' ? 'Interna'
                            : 'Pronta Entrega'}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {order.artType || '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {order.artStatus ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ART_STATUS_COLOR[order.artStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ART_STATUS_LABEL[order.artStatus] ?? order.artStatus}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <BowColorDot color={item?.bowColor ?? null} />
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {item?.bowType ? BOW_LABEL[item.bowType] ?? '—' : '—'}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {item?.bowQty != null ? (
                        <span className="font-bold text-purple-700 text-sm">{item.bowQty}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {item?.appliqueType ? APPLIQUE_LABEL[item.appliqueType] ?? '—' : '—'}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {item?.appliqueQty != null ? (
                        <span className="font-bold text-purple-700 text-sm">{item.appliqueQty}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {item?.totalItems != null ? (
                        <span className="font-bold text-blue-600 text-sm">{item.totalItems}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600 font-medium">
                        {order.store?.name || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {setor ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                          {setor}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {order.dueDate ? new Date(order.dueDate).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
