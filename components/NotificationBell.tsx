'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface DueDateNotif {
  id: string
  type: 'DUE_DATE'
  isDemand: false
  recipientName: string
  externalId: string | null
  department: string
  responsible: string | null
  dueDate: string
  diffDays: number
  atrasado: boolean
  label: string
}

interface DemandNotif {
  id: string
  type: 'DEMAND_READY'
  isDemand: true
  title: string
  message: string
  read: boolean
  demandId: string | null
  createdAt: string
}

interface StockNotif {
  id: string
  type: 'LOW_STOCK'
  isDemand: false
  isStock: true
  bowColor: string
  bowType: string
  quantity: number
  label: string
  critico: boolean
}

type AnyNotif = DueDateNotif | DemandNotif | StockNotif

const BOW_COLOR_MAP: Record<string, string> = {
  'AMARELO BEBE': '#fef08a', 'AMARELO OURO': '#d97706', 'AZUL BEBE': '#bfdbfe',
  'AZUL ROYAL': '#1d4ed8', 'DOURADO': '#ca8a04', 'LARANJA': '#f97316',
  'LILAS': '#c084fc', 'MARROM': '#92400e', 'PINK': '#ec4899', 'PRETO': '#1e293b',
  'ROSA BEBE': '#fbcfe8', 'ROSE': '#fb7185', 'ROXO': '#a855f7', 'VERDE': '#22c55e',
  'VERDE AGUA': '#2dd4bf', 'VERDE MUSGO': '#4d7c0f', 'VERMELHO': '#ef4444',
}
const BOW_TYPE_LABEL: Record<string, string> = { SIMPLE: 'Simples', LUXURY: 'Luxo' }

export default function NotificationBell() {
  const { data: session } = useSession()
  const [items, setItems]   = useState<AnyNotif[]>([])
  const [open, setOpen]     = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [marking, setMarking] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const canSee = session?.user?.role === 'ADMIN' || session?.user?.role === 'DELEGADOR' || session?.user?.role === 'OPERADOR'

  const loadNotifs = useCallback(() => {
    fetch('/api/notificacoes')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!canSee) return
    loadNotifs()
    const interval = setInterval(loadNotifs, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [canSee, loadNotifs])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleMarkRead(id: string) {
    setMarking(id)
    try {
      await fetch('/api/notificacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setItems(prev => prev.map(n =>
        n.id === id && n.isDemand ? { ...n, read: true } : n
      ))
    } finally {
      setMarking(null)
    }
  }

  async function handleMarkAllRead() {
    const unread = items.filter(n => n.isDemand && !(n as DemandNotif).read)
    await Promise.all(unread.map(n => handleMarkRead(n.id)))
  }

  if (!canSee) return null

  const demandNotifs  = items.filter(n => n.isDemand) as DemandNotif[]
  const stockNotifs   = items.filter(n => !n.isDemand && (n as any).isStock) as StockNotif[]
  const dueDateNotifs = items.filter(n => !n.isDemand && !(n as any).isStock) as DueDateNotif[]
  const unreadDemands = demandNotifs.filter(n => !n.read)
  const atrasados     = dueDateNotifs.filter(n => n.atrasado)
  const proximos      = dueDateNotifs.filter(n => !n.atrasado)

  // Badge conta: demandas não lidas + tarefas de prazo + estoque crítico (zerado)
  const criticalStock = stockNotifs.filter(s => s.critico)
  const badgeCount = unreadDemands.length + dueDateNotifs.length + criticalStock.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notificações"
      >
        <span className="text-xl">🔔</span>
        {loaded && badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Notificações</h3>
            {unreadDemands.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-purple-500 hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[480px] overflow-y-auto">
            {badgeCount === 0 && demandNotifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                Nenhuma notificação no momento.
              </div>
            ) : (
              <>
                {/* ── Notificações de Demanda ── */}
                {demandNotifs.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold text-purple-600 uppercase bg-purple-50 flex items-center justify-between">
                      <span>Demandas ({demandNotifs.length})</span>
                      {unreadDemands.length > 0 && (
                        <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {unreadDemands.length} nova(s)
                        </span>
                      )}
                    </p>
                    {demandNotifs.map(n => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-gray-50 transition-colors border-l-4 ${
                          n.read ? 'border-l-gray-200 bg-white' : 'border-l-purple-400 bg-purple-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${n.read ? 'text-gray-500' : 'text-gray-800'}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-300 mt-1">
                              {new Date(n.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          {!n.read && (
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              disabled={marking === n.id}
                              className="text-xs text-purple-500 hover:underline whitespace-nowrap flex-shrink-0 mt-0.5 disabled:opacity-50"
                            >
                              {marking === n.id ? '...' : 'Lida'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Alertas de Estoque Baixo ── */}
                {stockNotifs.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold text-orange-600 uppercase bg-orange-50 flex items-center justify-between">
                      <span>Estoque de Laços ({stockNotifs.length})</span>
                      {criticalStock.length > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {criticalStock.length} sem estoque
                        </span>
                      )}
                    </p>
                    {stockNotifs.map(s => {
                      const hex = BOW_COLOR_MAP[s.bowColor?.toUpperCase().trim()] ?? '#e5e7eb'
                      return (
                        <div key={s.id} className={`px-4 py-2.5 border-b border-gray-50 flex items-center justify-between gap-3 border-l-4 ${s.critico ? 'border-l-red-500 bg-red-50/30' : 'border-l-orange-400 bg-orange-50/20'}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: hex }} />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{s.bowColor}</p>
                              <p className="text-xs text-gray-400">{BOW_TYPE_LABEL[s.bowType] ?? s.bowType}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.critico ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            {s.critico ? '⚠ Zerado' : `⚠ ${s.label}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Notificações de Prazo ── */}
                {dueDateNotifs.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold text-red-500 uppercase bg-red-50">
                      Prazos ({dueDateNotifs.length})
                    </p>
                    {atrasados.length > 0 && (
                      <div>
                        <p className="px-4 py-1.5 text-xs font-medium text-red-400 bg-red-50/50">
                          Atrasadas ({atrasados.length})
                        </p>
                        {atrasados.map(n => <DueDateItem key={n.id} n={n} />)}
                      </div>
                    )}
                    {proximos.length > 0 && (
                      <div>
                        <p className="px-4 py-1.5 text-xs font-medium text-yellow-500 bg-yellow-50/50">
                          Vencem em breve ({proximos.length})
                        </p>
                        {proximos.map(n => <DueDateItem key={n.id} n={n} />)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DueDateItem({ n }: { n: DueDateNotif }) {
  return (
    <div className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${n.atrasado ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-yellow-400'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm truncate">{n.recipientName}</p>
          <p className="text-xs text-gray-500">{n.department}</p>
          {n.responsible && <p className="text-xs text-gray-400">Resp: {n.responsible}</p>}
          {n.externalId && <p className="text-xs text-gray-400 font-mono">{n.externalId}</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
          n.atrasado
            ? 'bg-red-100 text-red-600'
            : n.diffDays === 0
              ? 'bg-orange-100 text-orange-600'
              : 'bg-yellow-100 text-yellow-700'
        }`}>
          {n.label}
        </span>
      </div>
    </div>
  )
}
