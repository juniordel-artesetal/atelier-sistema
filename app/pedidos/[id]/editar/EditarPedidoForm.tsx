'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Props {
  order: any
  item: any
  currentStepName: string | null
  currentStepStatus: string | null
}

const STEP_STATUS_LABEL: Record<string, string> = {
  TODO: 'Aguardando',
  DOING: 'Em andamento',
  DONE: 'Concluído',
}
const STEP_STATUS_COLOR: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-600',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700',
}

interface HistoryEntry {
  id: string
  userName: string
  field: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

const FIELD_LABELS: Record<string, string> = {
  externalId: 'ID Shopee', buyerUsername: 'ID Usuário', storeId: 'Loja',
  recipientName: 'Destinatário', dueDate: 'Data de Envio', notes: 'Observação',
  status: 'Status', theme: 'Tema', productionType: 'Tipo de Produção',
  artType: 'Tipo de Arte', artStatus: 'Status da Arte',
  productName: 'Produto', variation: 'Variação', quantity: 'Quantidade',
  totalItems: 'Qtd de Itens', childName: 'Nome e Idade', bowColor: 'Cor do Laço',
  bowType: 'Tipo do Laço', bowQty: 'Qtd de Laços', appliqueType: 'Tipo de Aplique',
  appliqueQty: 'Qtd de Apliques',
}

export default function EditarPedidoForm({ order, item, currentStepName, currentStepStatus }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const isOp = session?.user?.role === 'OPERADOR'
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/${order.id}/history`)
      .then(r => r.json())
      .then(setHistory)
      .catch(() => {})
  }, [order.id])

  const [form, setForm] = useState({
    // ── Dados do pedido ───────────────────────────────────────────────
    externalId:     order.externalId     ?? '',
    buyerUsername:  order.buyerUsername  ?? '',
    storeId:        order.storeId        ?? 'store_fofuras',
    recipientName:  order.recipientName  ?? '',
    dueDate:        order.dueDate ? new Date(order.dueDate).toISOString().split('T')[0] : '',
    notes:          order.notes          ?? '',
    status:         order.status         ?? 'PENDING',
    productionType: order.productionType ?? '',
    // ── Arte ──────────────────────────────────────────────────────────
    artType:        order.artType        ?? '',
    artStatus:      order.artStatus      ?? '',
    // ── Dados do produto ─────────────────────────────────────────────
    productName:    item?.productName    ?? '',
    variation:      item?.variation      ?? '',
    quantity:       item?.quantity       ?? 1,
    totalItems:     item?.totalItems     ?? '',
    theme:          item?.theme ?? order.theme ?? '',
    childName:      item?.childName      ?? '',
    // ── Laço e Aplique ────────────────────────────────────────────────
    bowColor:       item?.bowColor       ?? '',
    bowType:        item?.bowType        ?? 'NONE',
    bowQty:         item?.bowQty         ?? '',
    appliqueType:   item?.appliqueType   ?? 'NONE',
    appliqueQty:    item?.appliqueQty    ?? '',
  })

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          itemId:      item?.id,
          artType:     form.artType     || null,
          artStatus:   form.artStatus   || null,
          quantity:    Number(form.quantity)    || 1,
          totalItems:  form.totalItems  !== '' ? Number(form.totalItems)  : null,
          bowQty:      form.bowQty      !== '' ? Number(form.bowQty)      : null,
          appliqueQty: form.appliqueQty !== '' ? Number(form.appliqueQty) : null,
        })
      })
      if (!res.ok) throw new Error()
      router.push('/pedidos')
      router.refresh()
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return
    setLoading(true)
    try {
      await fetch(`/api/orders/${order.id}`, { method: 'DELETE' })
      router.push('/pedidos')
      router.refresh()
    } catch {
      setError('Erro ao excluir.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── DADOS DO PEDIDO ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Dados do Pedido</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">ID Shopee</label>
            <input name="externalId" value={form.externalId} onChange={handle} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">ID Usuário (Shopee)</label>
            <input name="buyerUsername" value={form.buyerUsername} onChange={handle} className={inputClass} placeholder="Ex: brunasantana373" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Loja</label>
            <select name="storeId" value={form.storeId} onChange={handle} className={inputClass}>
              <option value="store_fofuras">Fofuras de Papel</option>
              <option value="store_artes">Artes e Tal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Destinatário *</label>
            <input name="recipientName" value={form.recipientName} onChange={handle} required className={inputClass} />
          </div>
          {!isOp && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data de Envio</label>
              <input name="dueDate" type="date" value={form.dueDate} onChange={handle} className={inputClass} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handle} className={inputClass}>
              <option value="PENDING">Aguardando</option>
              <option value="IN_PROGRESS">Em produção</option>
              <option value="DONE">Concluído</option>
              <option value="POSTED">Postado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Produção</label>
            <select name="productionType" value={form.productionType} onChange={handle} className={inputClass}>
              <option value="">-- Selecione --</option>
              <option value="EXTERNA">Externa</option>
              <option value="INTERNA">Interna</option>
              <option value="PRONTA_ENTREGA">Pronta Entrega</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">Setor Atual</label>
          {currentStepName ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
                {currentStepName}
              </span>
              {currentStepStatus && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STEP_STATUS_COLOR[currentStepStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STEP_STATUS_LABEL[currentStepStatus] ?? currentStepStatus}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">Nenhum setor ativo</span>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Observação</label>
          <textarea name="notes" value={form.notes} onChange={handle} rows={2} className={inputClass} />
        </div>
      </div>

      {/* ── ARTE ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Arte</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Arte</label>
            <input name="artType" value={form.artType} onChange={handle} placeholder="Ex: Cofrinho, Aplique, Kit" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Status da Arte</label>
            <select name="artStatus" value={form.artStatus} onChange={handle} className={inputClass}>
              <option value="">-- Selecione --</option>
              <option value="APROVADO">Aprovado</option>
              <option value="ARTE_IGUAL">Arte Igual</option>
              <option value="ARTE_CLIENTE">Arte Cliente</option>
              <option value="PRODUZIDO_SEM_APROVACAO">Produzido sem Aprovação</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── DADOS DO PRODUTO ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Dados do Produto</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Produto *</label>
            <input name="productName" value={form.productName} onChange={handle} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Variação</label>
            <input name="variation" value={form.variation} onChange={handle} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Quantidade</label>
            <input name="quantity" type="number" min={1} value={form.quantity} onChange={handle} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tema</label>
            <input name="theme" value={form.theme} onChange={handle} className={inputClass} placeholder="Ex: Frozen" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Nome e Idade</label>
            <input name="childName" value={form.childName} onChange={handle} className={inputClass} placeholder="Ex: Ana 5 anos" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Qtd de Itens no Pedido</label>
            <input name="totalItems" type="number" min={0} value={form.totalItems} onChange={handle} className={`${inputClass} font-bold text-blue-600`} placeholder="Ex: 50" />
          </div>
        </div>
      </div>

      {/* ── LAÇO E APLIQUE ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Laço e Aplique</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Cor do Laço</label>
            <input name="bowColor" value={form.bowColor} onChange={handle} className={inputClass} placeholder="Ex: Rosa bebê" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tipo do Laço</label>
            <select name="bowType" value={form.bowType} onChange={handle} className={inputClass}>
              <option value="NONE">Sem laço</option>
              <option value="SIMPLE">Simples</option>
              <option value="LUXURY">Luxo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Qtd de Laços</label>
            <input name="bowQty" type="number" min={0} value={form.bowQty} onChange={handle} className={`${inputClass} font-bold text-purple-600`} placeholder="Ex: 30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Aplique</label>
            <select name="appliqueType" value={form.appliqueType} onChange={handle} className={inputClass}>
              <option value="NONE">Sem aplique</option>
              <option value="SIMPLE">Simples</option>
              <option value="THREE_D">3D</option>
              <option value="THREE_D_LUX">3D Luxo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Qtd de Apliques</label>
            <input name="appliqueQty" type="number" min={0} value={form.appliqueQty} onChange={handle} className={`${inputClass} font-bold text-purple-600`} placeholder="Ex: 20" />
          </div>
        </div>
      </div>

      {/* HISTÓRICO */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <button type="button" onClick={() => setShowHistory(v => !v)} className="flex items-center justify-between w-full">
          <h2 className="font-semibold text-gray-700">
            Histórico de alterações
            {history.length > 0 && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{history.length}</span>
            )}
          </h2>
          <span className="text-gray-400 text-sm">{showHistory ? '▲' : '▼'}</span>
        </button>
        {showHistory && (
          <div className="mt-4 space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhuma alteração registrada ainda.</p>
            ) : (
              history.map(h => (
                <div key={h.id} className="flex items-start gap-3 text-xs border-b border-gray-50 pb-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                    {h.userName[0]}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-700">{h.userName}</span>
                    <span className="text-gray-400"> alterou </span>
                    <span className="font-medium text-gray-700">{FIELD_LABELS[h.field] ?? h.field}</span>
                    {h.oldValue && h.oldValue !== '—' && (
                      <span className="text-gray-400"> de <span className="line-through text-red-400">{h.oldValue}</span></span>
                    )}
                    {h.newValue && (
                      <span className="text-gray-400"> para <span className="text-green-600 font-medium">{h.newValue}</span></span>
                    )}
                    <p className="text-gray-300 mt-0.5">{new Date(h.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={handleDelete}
          className="border border-red-200 text-red-500 font-medium px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-sm">
          Excluir
        </button>
        <button type="button" onClick={() => router.back()}
          className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
