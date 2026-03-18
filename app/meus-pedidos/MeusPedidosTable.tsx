'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

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

interface Pedido {
  id: string
  externalId: string | null
  recipientName: string
  status: string
  theme: string | null
  store: { name: string } | null
  items: OrderItem[]
  setor: string
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
const BOW_LABEL: Record<string, string> = {
  NONE: '—', SIMPLE: 'Simples', LUXURY: 'Luxo',
}
const APPLIQUE_LABEL: Record<string, string> = {
  NONE: '—', SIMPLE: 'Simples', THREE_D: '3D', THREE_D_LUX: '3D Luxo',
}

const BOW_COLOR_MAP: Record<string, string> = {
  'ROSA': '#f9a8d4', 'ROSA BEBE': '#fbcfe8', 'ROSA BEBÊ': '#fbcfe8',
  'PINK': '#ec4899', 'AZUL': '#60a5fa', 'AZUL BEBE': '#bfdbfe',
  'AZUL BEBÊ': '#bfdbfe', 'AZUL ROYAL': '#1d4ed8', 'VERMELHO': '#ef4444',
  'VERDE': '#22c55e', 'VERDE MUSGO': '#4d7c0f', 'AMARELO': '#facc15',
  'AMARELO OURO': '#d97706', 'LARANJA': '#f97316', 'ROXO': '#a855f7',
  'BRANCO': '#e2e8f0', 'PRETO': '#1e293b', 'DOURADO': '#ca8a04',
}

export default function MeusPedidosTable({ pedidos }: { pedidos: Pedido[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return pedidos
    return pedidos.filter(p => {
      const item = p.items[0]
      return (
        p.externalId?.toLowerCase().includes(q)      ||
        p.recipientName.toLowerCase().includes(q)    ||
        p.theme?.toLowerCase().includes(q)           ||
        item?.childName?.toLowerCase().includes(q)   ||
        item?.bowColor?.toLowerCase().includes(q)    ||
        item?.productName?.toLowerCase().includes(q)
      )
    })
  }, [pedidos, search])

  const inputClass = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"

  return (
    <div className="space-y-4">
      {/* BUSCA */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, tema, produto, cor do laço..."
          className={`${inputClass} w-full`}
        />
      </div>

      <p className="text-xs text-gray-400 px-1">{filtered.length} de {pedidos.length} pedidos</p>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-gray-500 font-medium">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">ID Shopee</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Destinatário</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Produto</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Tema</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Criança</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Cor Laço</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Tipo Laço</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">Qtd Laço</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Aplique</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">Qtd Itens</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Loja</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Setor</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const item = p.items[0]
                const hex  = item?.bowColor ? BOW_COLOR_MAP[item.bowColor.toUpperCase().trim()] : null
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-purple-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/pedidos/${p.id}/editar`)}>
                    <td className="px-3 py-3 text-gray-400 text-xs font-mono whitespace-nowrap">{p.externalId || '—'}</td>
                    <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{p.recipientName}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs max-w-[140px] truncate" title={item?.productName}>
                      {item?.productName || '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{p.theme || '—'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{item?.childName || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {item?.bowColor ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: hex ?? '#e5e7eb' }} />
                          <span className="text-xs text-gray-600">{item.bowColor}</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
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
                      {item?.totalItems != null ? (
                        <span className="font-bold text-blue-600 text-sm">{item.totalItems}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600 font-medium">
                        {p.store?.name || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                        {p.setor}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
