'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface ProductionResponsavel { id: string; name: string }
interface Operador { id: string; name: string }
interface BowSummary { cor: string; tipo: string; quantidade: number }

interface DemandItem {
  id: string
  orderId: string
  externalId: string | null
  recipientName: string
  dueDate: string | null
  productionType: string | null
}

interface Demand {
  id: string
  status: 'PENDING' | 'READY'
  productionResponsibleId: string
  responsavelName: string
  notifyUserId: string | null
  createdByName: string
  createdAt: string
  checkSepararLacos: boolean
  checkSepararTags: boolean
  checkSepararAdesivos: boolean
  notifiedAt: string | null
  items: DemandItem[]
  bowSummary: BowSummary[]
}

interface ASepararGroup {
  responsavelId: string
  responsavelName: string
  orders: {
    orderId: string
    externalId: string | null
    recipientName: string
    dueDate: string | null
    productionType: string | null
    departmentName: string
  }[]
  bowSummary: BowSummary[]
}

const BOW_TYPE_LABEL: Record<string, string> = {
  SIMPLE: 'Simples', LUXURY: 'Luxo', NONE: 'Sem tipo',
}
const PROD_LABEL: Record<string, string> = {
  EXTERNA: 'Prod. Externa', INTERNA: 'Prod. Interna', PRONTA_ENTREGA: 'Pronta Entrega',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export default function DemandasPage() {
  const { data: session } = useSession()
  const role = session?.user?.role

  const [demands, setDemands]           = useState<Demand[]>([])
  const [aSeparar, setASeparar]         = useState<ASepararGroup[]>([])
  const [loading, setLoading]           = useState(false)
  const [expanded, setExpanded]         = useState<Set<string>>(new Set())
  const [expandedSep, setExpandedSep]   = useState<Set<string>>(new Set())
  const [responsaveis, setResponsaveis] = useState<ProductionResponsavel[]>([])
  const [operadores, setOperadores]     = useState<Operador[]>([])

  const [availableOrders, setAvailableOrders]   = useState<any[]>([])
  const [showForm, setShowForm]                 = useState(false)
  const [selectedResp, setSelectedResp]         = useState('')
  const [selectedUser, setSelectedUser]         = useState('')
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [saving, setSaving]                     = useState(false)
  const [completing, setCompleting]             = useState<string | null>(null)

  const canManage = role === 'ADMIN' || role === 'DELEGADOR'

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [demandsRes, aSepararRes] = await Promise.all([
      fetch('/api/demandas').then(r => r.json()),
      fetch('/api/demandas/a-separar').then(r => r.json()),
    ])
    setDemands(Array.isArray(demandsRes) ? demandsRes : [])
    setASeparar(Array.isArray(aSepararRes) ? aSepararRes : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
    fetch('/api/admin/responsaveis-producao')
      .then(r => r.json())
      .then(data => setResponsaveis(Array.isArray(data) ? data.filter((r: any) => r.active) : []))
      .catch(() => {})
    fetch('/api/admin/usuarios')
      .then(r => r.json())
      .then(data => setOperadores(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [loadAll])

  useEffect(() => {
    if (!selectedResp) { setAvailableOrders([]); return }
    fetch(`/api/demandas/pedidos-disponiveis?responsavelId=${selectedResp}`)
      .then(r => r.json())
      .then(data => setAvailableOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [selectedResp])

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleExpandSep(id: string) {
    setExpandedSep(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleOrder(id: string) {
    setSelectedOrderIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleCreate() {
    if (!selectedResp || selectedOrderIds.size === 0) return
    setSaving(true)
    try {
      await fetch('/api/demandas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionResponsibleId: selectedResp,
          notifyUserId: selectedUser || null,
          orderIds: Array.from(selectedOrderIds),
        }),
      })
      setShowForm(false)
      setSelectedResp('')
      setSelectedUser('')
      setSelectedOrderIds(new Set())
      loadAll()
    } finally {
      setSaving(false)
    }
  }

  async function handleChecklist(demandId: string, field: string, value: boolean) {
    await fetch(`/api/demandas/${demandId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateChecklist', [field]: value }),
    })
    setDemands(prev => prev.map(d => d.id === demandId ? { ...d, [field]: value } : d))
  }

  async function handleComplete(demandId: string) {
    setCompleting(demandId)
    try {
      await fetch(`/api/demandas/${demandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      loadAll()
    } finally {
      setCompleting(null)
    }
  }

  async function handleDelete(demandId: string) {
    if (!confirm('Excluir esta demanda?')) return
    await fetch(`/api/demandas/${demandId}`, { method: 'DELETE' })
    loadAll()
  }

  const inputClass = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Criação de Demanda</h1>
          <p className="text-gray-500 text-sm mt-1">Organize e notifique as responsáveis de produção</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm"
          >
            {showForm ? 'Cancelar' : '+ Nova Demanda'}
          </button>
        )}
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO */}
      {showForm && canManage && (
        <div className="bg-white rounded-xl border border-purple-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">Nova Demanda</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Responsável de Produção *</label>
              <select value={selectedResp} onChange={e => { setSelectedResp(e.target.value); setSelectedOrderIds(new Set()) }} className={inputClass + ' w-full'}>
                <option value="">Selecione...</option>
                {responsaveis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notificar usuário (opcional)</label>
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className={inputClass + ' w-full'}>
                <option value="">Nenhum</option>
                {operadores.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
            </div>
          </div>

          {selectedResp && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Selecionar pedidos ({selectedOrderIds.size} selecionados)
              </label>
              {availableOrders.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">Nenhum pedido disponível para esta responsável nos setores de produção.</p>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 w-8">
                          <input type="checkbox"
                            checked={availableOrders.length > 0 && availableOrders.every(o => selectedOrderIds.has(o.orderId))}
                            onChange={e => {
                              if (e.target.checked) setSelectedOrderIds(new Set(availableOrders.map((o: any) => o.orderId)))
                              else setSelectedOrderIds(new Set())
                            }}
                            className="accent-purple-600"
                          />
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Destinatário</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">ID Shopee</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Setor</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Envio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableOrders.map((o: any) => (
                        <tr key={o.orderId}
                          className={`border-t border-gray-50 cursor-pointer hover:bg-purple-50 ${selectedOrderIds.has(o.orderId) ? 'bg-purple-50' : ''}`}
                          onClick={() => toggleOrder(o.orderId)}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selectedOrderIds.has(o.orderId)} onChange={() => toggleOrder(o.orderId)} className="accent-purple-600" onClick={e => e.stopPropagation()} />
                          </td>
                          <td className="px-3 py-2 text-xs font-medium text-gray-700">{o.recipientName}</td>
                          <td className="px-3 py-2 text-xs font-mono text-gray-400">{o.externalId || '—'}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{o.departmentName}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{formatDate(o.dueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={() => { setShowForm(false); setSelectedResp(''); setSelectedUser(''); setSelectedOrderIds(new Set()) }}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !selectedResp || selectedOrderIds.size === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? 'Criando...' : 'Criar Demanda'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* ── SEÇÃO: A SEPARAR (automático) ── */}
          {aSeparar.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Demanda a Separar</h2>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                  {aSeparar.reduce((s, g) => s + g.orders.length, 0)} pedidos
                </span>
              </div>
              <div className="space-y-3">
                {aSeparar.map(group => {
                  const isExp = expandedSep.has(group.responsavelId)
                  const minDue = group.orders.reduce((min: string | null, o) => {
                    if (!o.dueDate) return min
                    if (!min) return o.dueDate
                    return o.dueDate < min ? o.dueDate : min
                  }, null)

                  return (
                    <div key={group.responsavelId} className="bg-white rounded-xl border border-orange-100 overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                                {group.responsavelName[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">Responsável pela Produção: {group.responsavelName}</p>
                                <p className="text-xs text-gray-400">{group.orders.length} pedidos nos setores de produção</p>
                              </div>
                              {minDue && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                                  Entrega mais próxima: {formatDate(minDue)}
                                </span>
                              )}
                            </div>

                            {group.bowSummary.length > 0 && (
                              <div className="flex flex-wrap gap-2 ml-11">
                                {group.bowSummary.map(b => (
                                  <span key={`${b.cor}__${b.tipo}`} className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-medium">
                                    {b.cor} {BOW_TYPE_LABEL[b.tipo] ?? b.tipo}: {b.quantidade}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => toggleExpandSep(group.responsavelId)}
                            className="text-gray-400 hover:text-gray-600 text-xs whitespace-nowrap"
                          >
                            {isExp ? '▲ Ocultar' : '▼ Ver pedidos'}
                          </button>
                        </div>
                      </div>

                      {isExp && (
                        <div className="border-t border-gray-100">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Destinatário</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">ID Shopee</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Setor</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Tipo Produção</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Envio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.orders.map((o, i) => (
                                <tr key={o.orderId} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                                  <td className="px-4 py-2 text-xs font-medium text-gray-700">{o.recipientName}</td>
                                  <td className="px-4 py-2 text-xs font-mono text-gray-400">{o.externalId || '—'}</td>
                                  <td className="px-4 py-2 text-xs text-gray-500">{o.departmentName}</td>
                                  <td className="px-4 py-2 text-xs text-gray-500">{PROD_LABEL[o.productionType ?? ''] ?? '—'}</td>
                                  <td className="px-4 py-2 text-xs text-gray-500">{formatDate(o.dueDate)}</td>
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
            </div>
          )}

          {/* ── SEÇÃO: DEMANDAS CRIADAS ── */}
          <div>
            {demands.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Demandas Criadas</h2>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  {demands.length}
                </span>
              </div>
            )}

            {demands.length === 0 && aSeparar.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-gray-500 font-medium">Nenhuma demanda ainda. Pedidos nos setores de produção aparecerão automaticamente.</p>
              </div>
            )}

            <div className="space-y-3">
              {demands.map(d => {
                const isExpanded = expanded.has(d.id)
                const allChecked = d.checkSepararLacos && d.checkSepararTags && d.checkSepararAdesivos
                const minDueDate = d.items.reduce((min: string | null, i) => {
                  if (!i.dueDate) return min
                  if (!min) return i.dueDate
                  return i.dueDate < min ? i.dueDate : min
                }, null)

                return (
                  <div key={d.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="p-5 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {d.responsavelName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{d.responsavelName}</p>
                            <p className="text-xs text-gray-400">{d.items.length} pedidos · Criado por {d.createdByName} · {formatDate(d.createdAt)}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {d.status === 'READY' ? 'Disponível' : 'Pendente'}
                          </span>
                          {minDueDate && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                              Entrega: {formatDate(minDueDate)}
                            </span>
                          )}
                        </div>

                        {d.bowSummary.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 ml-11">
                            {d.bowSummary.map(b => (
                              <span key={`${b.cor}__${b.tipo}`} className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-medium">
                                {b.cor} {BOW_TYPE_LABEL[b.tipo] ?? b.tipo}: {b.quantidade}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-4 mt-3 ml-11">
                          {[
                            { key: 'checkSepararLacos',    label: 'Separar laços' },
                            { key: 'checkSepararTags',     label: 'Separar tags' },
                            { key: 'checkSepararAdesivos', label: 'Separar adesivos do cofre' },
                          ].map(item => (
                            <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(d as any)[item.key]}
                                onChange={e => handleChecklist(d.id, item.key, e.target.checked)}
                                className="accent-purple-600 w-4 h-4"
                                disabled={d.status === 'READY'}
                              />
                              <span className={`text-sm ${(d as any)[item.key] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                {item.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {canManage && d.status === 'PENDING' && (
                          <button
                            onClick={() => handleComplete(d.id)}
                            disabled={completing === d.id || !allChecked}
                            title={!allChecked ? 'Conclua o checklist primeiro' : ''}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                          >
                            {completing === d.id ? '...' : 'Concluir'}
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="border border-red-200 text-red-500 text-xs font-medium px-4 py-2 rounded-lg hover:bg-red-50"
                          >
                            Excluir
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(d.id)}
                          className="text-gray-400 hover:text-gray-600 text-xs text-center"
                        >
                          {isExpanded ? '▲ Ocultar' : '▼ Ver pedidos'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Destinatário</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">ID Shopee</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Tipo Produção</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Envio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {d.items.map((item, i) => (
                              <tr key={item.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                                <td className="px-4 py-2 text-xs font-medium text-gray-700">{item.recipientName}</td>
                                <td className="px-4 py-2 text-xs font-mono text-gray-400">{item.externalId || '—'}</td>
                                <td className="px-4 py-2 text-xs text-gray-500">{PROD_LABEL[item.productionType ?? ''] ?? '—'}</td>
                                <td className="px-4 py-2 text-xs text-gray-500">{formatDate(item.dueDate)}</td>
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
          </div>
        </>
      )}
    </div>
  )
}
