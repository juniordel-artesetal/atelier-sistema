'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const BOW_COLORS = [
  'AMARELO BEBE', 'AMARELO OURO', 'AZUL BEBE', 'AZUL ROYAL', 'DOURADO',
  'LARANJA', 'LILAS', 'MARROM', 'PINK', 'PRETO', 'ROSA BEBE', 'ROSE',
  'ROXO', 'VERDE', 'VERDE AGUA', 'VERDE MUSGO', 'VERMELHO',
]

interface BowItem {
  bowColor: string
  bowType: string
  bowQty: string
  appliqueType: string
  appliqueQty: string
}

const emptyBow = (): BowItem => ({
  bowColor: '', bowType: 'NONE', bowQty: '', appliqueType: 'NONE', appliqueQty: '',
})

export default function NovoPedidoForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [bows, setBows]       = useState<BowItem[]>([emptyBow()])

  const [form, setForm] = useState({
    externalId:     '',
    buyerUsername:  '',
    storeId:        'store_fofuras',
    recipientName:  '',
    dueDate:        '',
    notes:          '',
    productionType: '',
    artType:        '',
    artStatus:      '',
    productName:    '',
    variation:      '',
    quantity:       1,
    totalItems:     '',
    theme:          '',
    childName:      '',
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
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity:      Number(form.quantity) || 1,
          totalItems:    form.totalItems !== '' ? Number(form.totalItems) : null,
          artType:       form.artType     || null,
          artStatus:     form.artStatus   || null,
          buyerUsername: form.buyerUsername || null,
          childName:     form.childName   || null,
          items: bows.map(b => ({
            bowColor:    b.bowColor    || null,
            bowType:     b.bowType     || 'NONE',
            bowQty:      b.bowQty     !== '' ? Number(b.bowQty)     : null,
            appliqueType: b.appliqueType || 'NONE',
            appliqueQty: b.appliqueQty !== '' ? Number(b.appliqueQty) : null,
          })),
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
            <div key={index} className="relative border border-gray-100 rounded-xl p-4 bg-gray-50">
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
