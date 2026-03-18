'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NovoPedidoForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    // ── Dados do pedido ───────────────────────────────────────────────────────
    externalId:     '',
    buyerUsername:  '',
    storeId:        'store_fofuras',
    recipientName:  '',
    dueDate:        '',
    notes:          '',
    productionType: '',
    // ── Arte ──────────────────────────────────────────────────────────────────
    artType:        '',
    artStatus:      '',
    // ── Dados do produto ──────────────────────────────────────────────────────
    productName:    '',
    variation:      '',
    quantity:       1,
    totalItems:     '',
    theme:          '',
    childName:      '',
    // ── Laço e Aplique ────────────────────────────────────────────────────────
    bowColor:       '',
    bowType:        'NONE',
    bowQty:         '',
    appliqueType:   'NONE',
    appliqueQty:    '',
  })

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity:    Number(form.quantity)   || 1,
          totalItems:  form.totalItems  !== '' ? Number(form.totalItems)  : null,
          bowQty:      form.bowQty      !== '' ? Number(form.bowQty)      : null,
          appliqueQty: form.appliqueQty !== '' ? Number(form.appliqueQty) : null,
          artType:     form.artType     || null,
          artStatus:   form.artStatus   || null,
          buyerUsername: form.buyerUsername || null,
          childName:   form.childName   || null,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar pedido')
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

      {/* ── DADOS DO PEDIDO ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Dados do Pedido</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">ID Shopee</label>
            <input name="externalId" value={form.externalId} onChange={handle} className={inputClass} placeholder="Ex: 25122211E4PXJ1" />
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
            <input name="recipientName" value={form.recipientName} onChange={handle} required className={inputClass} placeholder="Nome do cliente" />
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
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Observação</label>
          <textarea name="notes" value={form.notes} onChange={handle} rows={2} className={inputClass} />
        </div>
      </div>

      {/* ── ARTE ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Arte</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Arte</label>
            <input name="artType" value={form.artType} onChange={handle} className={inputClass} placeholder="Ex: Cofrinho, Aplique, Kit" />
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

      {/* ── DADOS DO PRODUTO ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Dados do Produto</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Produto *</label>
            <input name="productName" value={form.productName} onChange={handle} required className={inputClass} placeholder="Ex: Cofrinho Personalizado" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Variação</label>
            <input name="variation" value={form.variation} onChange={handle} className={inputClass} placeholder="Ex: Completo (embalagem+laço+tag),20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Quantidade</label>
            <input name="quantity" type="number" min={1} value={form.quantity} onChange={handle} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tema</label>
            <input name="theme" value={form.theme} onChange={handle} className={inputClass} placeholder="Ex: Frozen MOD 1" />
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

      {/* ── LAÇO E APLIQUE ──────────────────────────────────────────────────── */}
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

      {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">
          {loading ? 'Salvando...' : 'Criar Pedido'}
        </button>
      </div>
    </form>
  )
}
