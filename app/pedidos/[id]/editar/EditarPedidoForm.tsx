'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const BOW_COLORS = [
  'AMARELO BEBE', 'AMARELO OURO', 'AZUL BEBE', 'AZUL ROYAL', 'DOURADO',
  'LARANJA', 'LILAS', 'MARROM', 'PINK', 'PRETO', 'ROSA BEBE', 'ROSE',
  'ROXO', 'VERDE', 'VERDE AGUA', 'VERDE MUSGO', 'VERMELHO',
]

interface BowItem {
  id?: string
  bowColor: string
  bowType: string
  bowQty: string | number
  appliqueType: string
  appliqueQty: string | number
}

const emptyBow = (): BowItem => ({
  bowColor: '', bowType: 'NONE', bowQty: '', appliqueType: 'NONE', appliqueQty: '',
})

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

  // Inicializa bows a partir de todos os items do pedido
  const [bows, setBows] = useState<BowItem[]>(() => {
    const items = order.items && order.items.length > 0 ? order.items : (item ? [item] : [])
    if (items.length === 0) return [emptyBow()]
    return items.map((it: any) => ({
      id:          it.id,
      bowColor:    it.bowColor    ?? '',
      bowType:     it.bowType     ?? 'NONE',
      bowQty:      it.bowQty      ?? '',
      appliqueType: it.appliqueType ?? 'NONE',
      appliqueQty: it.appliqueQty ?? '',
    }))
  })

  useEffect(() => {
    fetch(`/api/orders/${order.id}/history`)
      .then(r => r.json())
      .then(setHistory)
      .catch(() => {})
  }, [order.id])

  const [form, setForm] = useState({
    externalId:     order.externalId     ?? '',
    buyerUsername:  order.buyerUsername  ?? '',
    storeId:        order.storeId        ?? 'store_fofuras',
    recipientName:  order.recipientName  ?? '',
    dueDate:        order.dueDate ? new Date(order.dueDate).toISOString().split('T')[0] : '',
    notes:          order.notes          ?? '',
    status:         order.status         ?? 'PENDING',
    productionType: order.productionType ?? '',
    artType:        order.artType        ?? '',
    artStatus:      order.artStatus      ?? '',
    productName:    item?.productName    ?? '',
    variation:      item?.variation      ?? '',
    quantity:       item?.quantity       ?? 1,
    totalItems:     item?.totalItems     ?? '',
    theme:          item?.theme ?? order.theme ?? '',
    childName:      item?.childName      ?? '',
  })

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleBow(index: number, field: keyof BowItem, value: string) {
    setBows(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b))
  }

  function addBow() {
    setBows(prev => [...prev, emptyBow()])
  }

  function removeBow(index: number) {
    setBows(prev => prev.filter((_, i) => i !== index))
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
          artType:     form.artType     || null,
          artStatus:   form.artStatus   || null,
          quantity:    Number(form.quantity)    || 1,
          totalItems:  form.totalItems  !== '' ? Number(form.totalItems)  : null,
          items: bows.map(b => ({
            id:          b.id || undefined,
            bowColor:    b.bowColor    || null,
            bowType:     b.bowType     || 'NONE',
            bowQty:      b.bowQty     !== '' ? Number(b.bowQty)     : null,
            appliqueType: b.appliqueType || 'NONE',
            appliqueQty: b.appliqueQty !== '' ? Number(b.appliqueQty) : null,
          })),
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

  async function handleRevertPost() {
    if (!confirm('Reverter postagem? O pedido voltará para a Expedição e os laços serão devolvidos ao estoque.')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order.id}/revert-post`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao reverter')
      router.push('/pedidos')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
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
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data de Envio</label>
            <input name="dueDate" type="date" value={form.dueDate} onChange={handle} className={inputClass} />
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
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handle} className={inputClass} disabled={isOp}>
              <option value="PENDING">Aguardando</option>
              <option value="IN_PROGRESS">Em produção</option>
              <option value="DONE">Concluído</option>
              <option value="POSTED">Enviado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Setor atual</label>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Laço e Aplique</h2>
          <button
            type="button"
            onClick={addBow}
            className="text-sm text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 font-medium"
          >
            + Adicionar cor
          </button>
        </div>

        <div className="space-y-4">
          {bows.map((bow, index) => (
            <div key={bow.id ?? index} className="relative border border-gray-100 rounded-xl p-4 bg-gray-50">
              {bows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBow(index)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-lg leading-none font-bold"
                  title="Remover"
                >
                  ×
                </button>
              )}
              {bows.length > 1 && (
                <p className="text-xs font-semibold text-purple-600 mb-3">Cor {index + 1}</p>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Cor do Laço</label>
                  <select
                    value={bow.bowColor}
                    onChange={e => handleBow(index, 'bowColor', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">-- Selecione --</option>
                    {BOW_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tipo do Laço</label>
                  <select
                    value={bow.bowType}
                    onChange={e => handleBow(index, 'bowType', e.target.value)}
                    className={inputClass}
                  >
                    <option value="NONE">Sem laço</option>
                    <option value="SIMPLE">Simples</option>
                    <option value="LUXURY">Luxo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Qtd de Laços</label>
                  <input
                    type="number" min={0}
                    value={bow.bowQty}
                    onChange={e => handleBow(index, 'bowQty', e.target.value)}
                    className={`${inputClass} font-bold text-purple-600`}
                    placeholder="Ex: 30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Aplique</label>
                  <select
                    value={bow.appliqueType}
                    onChange={e => handleBow(index, 'appliqueType', e.target.value)}
                    className={inputClass}
                  >
                    <option value="NONE">Sem aplique</option>
                    <option value="SIMPLE">Simples</option>
                    <option value="THREE_D">3D</option>
                    <option value="THREE_D_LUX">3D Luxo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Qtd de Apliques</label>
                  <input
                    type="number" min={0}
                    value={bow.appliqueQty}
                    onChange={e => handleBow(index, 'appliqueQty', e.target.value)}
                    className={`${inputClass} font-bold text-purple-600`}
                    placeholder="Ex: 20"
                  />
                </div>
              </div>
            </div>
          ))}
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
        {session?.user?.role === 'ADMIN' && order.status === 'POSTED' && (
          <button type="button" onClick={handleRevertPost} disabled={loading}
            className="border border-orange-300 text-orange-700 bg-orange-50 font-medium px-4 py-3 rounded-lg hover:bg-orange-100 transition-colors text-sm disabled:opacity-50">
            Reverter postagem
          </button>
        )}
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
