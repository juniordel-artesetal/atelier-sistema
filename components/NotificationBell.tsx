'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface Notification {
  id: string
  recipientName: string
  externalId: string | null
  department: string
  responsible: string | null
  dueDate: string
  diffDays: number
  atrasado: boolean
  label: string
}

export default function NotificationBell() {
  const { data: session } = useSession()
  const [items, setItems]     = useState<Notification[]>([])
  const [open, setOpen]       = useState(false)
  const [loaded, setLoaded]   = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)

  const canSee = session?.user?.role === 'ADMIN' || session?.user?.role === 'DELEGADOR'

  useEffect(() => {
    if (!canSee) return
    fetch('/api/notificacoes')
      .then(r => r.json())
      .then(data => { setItems(data); setLoaded(true) })
      .catch(() => setLoaded(true))

    // Recarrega a cada 5 minutos
    const interval = setInterval(() => {
      fetch('/api/notificacoes').then(r => r.json()).then(setItems).catch(() => {})
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [canSee])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!canSee) return null

  const atrasados = items.filter(i => i.atrasado)
  const proximos  = items.filter(i => !i.atrasado)
  const total     = items.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notificações de prazo"
      >
        <span className="text-xl">🔔</span>
        {loaded && total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Notificações de Prazo</h3>
            <span className="text-xs text-gray-400">{total} tarefas</span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {total === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                Nenhuma tarefa vencida ou próxima do prazo.
              </div>
            ) : (
              <>
                {atrasados.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold text-red-500 uppercase bg-red-50">
                      Atrasadas ({atrasados.length})
                    </p>
                    {atrasados.map(n => (
                      <NotifItem key={n.id} n={n} />
                    ))}
                  </div>
                )}
                {proximos.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold text-yellow-600 uppercase bg-yellow-50">
                      Vencem em breve ({proximos.length})
                    </p>
                    {proximos.map(n => (
                      <NotifItem key={n.id} n={n} />
                    ))}
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

function NotifItem({ n }: { n: Notification }) {
  return (
    <div className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${n.atrasado ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-yellow-400'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm truncate">{n.recipientName}</p>
          <p className="text-xs text-gray-500">{n.department}</p>
          {n.responsible && (
            <p className="text-xs text-gray-400">Resp: {n.responsible}</p>
          )}
          {n.externalId && (
            <p className="text-xs text-gray-400 font-mono">{n.externalId}</p>
          )}
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
