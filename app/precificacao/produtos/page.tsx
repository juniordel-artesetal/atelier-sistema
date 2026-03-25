'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Material    { id: string; nome: string; precoUnidade: number; unidade: string }
interface MaterialItem { materialId: string | null; nomeMaterial: string; qtdUsada: number; custoUnit: number; rendimento: number }
interface KitItem     { produtoId: string; nomeProduto: string; qtdItens: number; custoUnit: number }
interface Config {
  id: string; tipo: 'UNITARIO' | 'KIT'; qtdKit: number
  custoMaterial: number; custoMaoObra: number; custoEmbalagem: number; custoArte: number
  custoTotal: number; impostos: number
  precoVenda: number | null; precoPromocional: number | null
  materiais: MaterialItem[]; kitItens: KitItem[]
}
interface Produto { id: string; sku: string | null; nome: string; categoria: string | null; configs: Config[] }

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"

function sugerirPreco(custo: number, imposto: number, margem: number, taxaCanal = 0.20, fixoCanal = 4) {
  const denom = 1 - taxaCanal - margem
  if (denom <= 0) return null
  return (custo + imposto + fixoCanal) / denom
}
function fmt(n: number) { return 'R$ ' + n.toFixed(2).replace('.', ',') }

// Canais de venda
const CANAIS_LISTA = [
  { key: 'shopee',  label: 'Shopee',         emoji: '🛍️', subs: null },
  { key: 'ml',      label: 'Mercado Livre',  emoji: '🟡', subs: [{ key: 'classico', label: 'Clássico (12%)' }, { key: 'premium', label: 'Premium (16%)' }] },
  { key: 'amazon',  label: 'Amazon',         emoji: '📦', subs: null },
  { key: 'tiktok',  label: 'TikTok Shop',    emoji: '🎵', subs: null },
  { key: 'elo7',    label: 'Elo7',           emoji: '🎨', subs: [{ key: 'padrao', label: 'Padrão (18%)' }, { key: 'maxima', label: 'Máxima (20%)' }] },
  { key: 'magalu',  label: 'Magalu',         emoji: '🛒', subs: null },
  { key: 'direta',  label: 'Venda Direta',   emoji: '🤝', subs: null },
]

function getTaxa(canal: string, sub: string, preco: number): { taxa: number; fixo: number; label: string } {
  if (canal === 'shopee') {
    if (preco < 80)  return { taxa: 0.20, fixo: 4.00,  label: 'Shopee até R$79,99 · 20% + R$4,00' }
    if (preco < 100) return { taxa: 0.14, fixo: 16.00, label: 'Shopee R$80–R$99,99 · 14% + R$16,00' }
    if (preco < 200) return { taxa: 0.14, fixo: 20.00, label: 'Shopee R$100–R$199,99 · 14% + R$20,00' }
    return             { taxa: 0.14, fixo: 26.00, label: 'Shopee acima R$200 · 14% + R$26,00' }
  }
  if (canal === 'ml')     return sub === 'premium' ? { taxa: 0.16, fixo: 0,    label: 'Mercado Livre Premium · 16%' } : { taxa: 0.12, fixo: 0, label: 'Mercado Livre Clássico · 12%' }
  if (canal === 'amazon') return { taxa: 0.12, fixo: 2.00, label: 'Amazon · 12% + R$2,00' }
  if (canal === 'tiktok') return { taxa: 0.06, fixo: 2.00, label: 'TikTok Shop · 6% + R$2,00' }
  if (canal === 'elo7')   return sub === 'maxima' ? { taxa: 0.20, fixo: 3.99, label: 'Elo7 Máxima · 20% + R$3,99' } : { taxa: 0.18, fixo: 3.99, label: 'Elo7 Padrão · 18% + R$3,99' }
  if (canal === 'magalu') return { taxa: 0.10, fixo: 0, label: 'Magalu · 10%' }
  return { taxa: 0.03, fixo: 0, label: 'Venda Direta · 3%' }
}

const EMPTY_CONFIG = {
  tipo: 'UNITARIO' as 'UNITARIO' | 'KIT',
  qtdKit: '1',
  canal: 'shopee',
  subOpcao: 'classico',
  tipoMaoObra: 'local' as 'local' | 'freelancer',
  custoMaoObra: '',
  tipoArte: 'local' as 'local' | 'freelancer',
  custoArte: '',
  custoEmbalagem: '',
  custosAdicionais: [] as { descricao: string; valor: string }[],
  impostos: '', precoVenda: '',
  materiais: [] as MaterialItem[],
  kitItens: [] as KitItem[],
}

export default function ProdutosPage() {
  const [produtos, setProdutos]           = useState<Produto[]>([])
  const [materiaisCad, setMateriaisCad]   = useState<Material[]>([])
  const [loading, setLoading]             = useState(true)
  const [busca, setBusca]                 = useState('')
  const [expanded, setExpanded]           = useState<string | null>(null)
  const [showProd, setShowProd]           = useState(false)
  const [editProdId, setEditProdId]       = useState<string | null>(null)
  const [prodForm, setProdForm]           = useState({ nome: '', sku: '', categoria: '' })
  const [savingProd, setSavingProd]       = useState(false)
  const [showConf, setShowConf]           = useState<string | null>(null)
  const [editConfId, setEditConfId]       = useState<string | null>(null)
  const [confForm, setConfForm]           = useState(EMPTY_CONFIG)
  const [savingConf, setSavingConf]       = useState(false)
  const [showNovoMat, setShowNovoMat]     = useState(false)
  const [novoMatIdx, setNovoMatIdx]       = useState<number | null>(null)
  const [novoMatForm, setNovoMatForm]     = useState({ nome: '', unidade: 'unidade', precoPacote: '', qtdPacote: '', fornecedor: '' })
  const [savingNovoMat, setSavingNovoMat] = useState(false)
  const [aliquotaPadrao, setAliquotaPadrao] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [p, m, trib] = await Promise.all([
      fetch('/api/precificacao/produtos').then(r => r.json()).catch(() => []),
      fetch('/api/precificacao/materiais').then(r => r.json()).catch(() => []),
      fetch('/api/precificacao/config-tributos').then(r => r.json()).catch(() => null),
    ])
    if (trib?.aliquotaPadrao) setAliquotaPadrao(Number(trib.aliquotaPadrao))
    const prods = (Array.isArray(p) ? p : []).map((prod: any) => ({
      ...prod,
      configs: (prod.variacoes || []).map((v: any) => ({
        ...v, tipo: v.tipo || 'UNITARIO',
        materiais: v.materiais || [], kitItens: v.kitItens || [],
      }))
    }))
    setProdutos(prods)
    setMateriaisCad(Array.isArray(m) ? m : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Custo = (qtd × custo_unit) ÷ rendimento — rendimento define quantos produtos saem desta qtd de material
  const custoMaterialCalc = confForm.materiais.reduce((s, m) => s + (Number(m.qtdUsada) * Number(m.custoUnit)) / Math.max(Number(m.rendimento) || 1, 0.0001), 0)
  const custoKitCalc      = confForm.kitItens.reduce((s, k) => s + Number(k.qtdItens) * Number(k.custoUnit), 0)
  const custoBase         = confForm.tipo === 'KIT' ? custoKitCalc : custoMaterialCalc
  const custoAdicionalTotal = (confForm as any).custosAdicionais?.reduce((s: number, c: any) => s + Number(c.valor || 0), 0) || 0
  const custoTotalCalc    = custoBase + Number(confForm.custoMaoObra||0) + Number(confForm.custoEmbalagem||0) + Number(confForm.custoArte||0) + custoAdicionalTotal
  const impostosVal    = Number(confForm.impostos||0)
  const precoRef       = Number(confForm.precoVenda) || sugerirPreco(custoTotalCalc, impostosVal, 0.30) || 50
  const canalSel       = getTaxa(confForm.canal || 'shopee', confForm.subOpcao || 'classico', precoRef)
  const precoSaudavel  = sugerirPreco(custoTotalCalc, impostosVal, 0.30, canalSel.taxa, canalSel.fixo)
  const precoBaixo     = sugerirPreco(custoTotalCalc, impostosVal, 0.15, canalSel.taxa, canalSel.fixo)
  const precoAlto      = sugerirPreco(custoTotalCalc, impostosVal, 0.45, canalSel.taxa, canalSel.fixo)

  async function saveProd() {
    if (!prodForm.nome) return alert('Nome obrigatório')
    setSavingProd(true)
    try {
      const url = editProdId ? `/api/precificacao/produtos/${editProdId}` : '/api/precificacao/produtos'
      const res = await fetch(url, { method: editProdId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prodForm) })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowProd(false); load()
    } catch (e: any) { alert(e.message) }
    finally { setSavingProd(false) }
  }

  async function deleteProd(id: string) {
    if (!confirm('Excluir este produto?')) return
    await fetch(`/api/precificacao/produtos/${id}`, { method: 'DELETE' }); load()
  }

  function addMaterialItem() {
    setConfForm(p => ({ ...p, materiais: [...p.materiais, { materialId: null, nomeMaterial: '', qtdUsada: 0, custoUnit: 0, rendimento: 1 }] }))
  }
  function selectMaterial(idx: number, matId: string) {
    const mat = materiaisCad.find(m => m.id === matId)
    const custoUnit = mat ? Number(mat.precoUnidade) : 0
    setConfForm(p => { const u = [...p.materiais]; u[idx] = { ...u[idx], materialId: matId, nomeMaterial: mat?.nome || '', custoUnit, rendimento: 1 }; return { ...p, materiais: u } })
  }
  function removeMaterialItem(idx: number) {
    setConfForm(p => ({ ...p, materiais: p.materiais.filter((_, i) => i !== idx) }))
  }

  async function saveNovoMaterial(idx: number) {
    if (!novoMatForm.nome || !novoMatForm.precoPacote || !novoMatForm.qtdPacote) return alert('Preencha os campos obrigatórios')
    setSavingNovoMat(true)
    try {
      const res = await fetch('/api/precificacao/materiais', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoMatForm) })
      if (!res.ok) throw new Error((await res.json()).error)
      const { id } = await res.json()
      const precoUnit = Number(novoMatForm.precoPacote) / Number(novoMatForm.qtdPacote)
      const mats = await fetch('/api/precificacao/materiais').then(r => r.json()).catch(() => [])
      setMateriaisCad(Array.isArray(mats) ? mats : [])
      setConfForm(p => { const u = [...p.materiais]; u[idx] = { ...u[idx], materialId: id, nomeMaterial: novoMatForm.nome, custoUnit: precoUnit }; return { ...p, materiais: u } })
      setShowNovoMat(false)
      setNovoMatForm({ nome: '', unidade: 'unidade', precoPacote: '', qtdPacote: '', fornecedor: '' })
    } catch (e: any) { alert(e.message) }
    finally { setSavingNovoMat(false) }
  }

  function addKitItem() {
    setConfForm(p => ({ ...p, kitItens: [...p.kitItens, { produtoId: '', nomeProduto: '', qtdItens: 1, custoUnit: 0 }] }))
  }
  function selectProdutoKit(idx: number, prodId: string) {
    const prod = produtos.find(p => p.id === prodId)
    const configUnit = prod?.configs.find(c => c.tipo === 'UNITARIO')
    const custoUnit = configUnit ? Number(configUnit.custoTotal) / Number(configUnit.qtdKit) : 0
    setConfForm(p => { const u = [...p.kitItens]; u[idx] = { ...u[idx], produtoId: prodId, nomeProduto: prod?.nome || '', custoUnit }; return { ...p, kitItens: u } })
  }
  function removeKitItem(idx: number) {
    setConfForm(p => ({ ...p, kitItens: p.kitItens.filter((_, i) => i !== idx) }))
  }

  async function saveConf(produtoId: string) {
    setSavingConf(true)
    try {
      const payload = {
        produtoId, tipo: confForm.tipo, canal: confForm.canal, subOpcao: confForm.subOpcao,
        qtdKit: Number(confForm.qtdKit || 1),
        custoMaterial: confForm.tipo === 'KIT' ? custoKitCalc : custoMaterialCalc,
        custoMaoObra: Number(confForm.custoMaoObra||0),
        custoEmbalagem: Number(confForm.custoEmbalagem||0),
        custoArte: Number(confForm.custoArte||0),
        custosAdicionais: (confForm as any).custosAdicionais || [],
        impostos: impostosVal,
        precoVenda: confForm.precoVenda ? Number(confForm.precoVenda) : null,
        materiais: confForm.tipo === 'UNITARIO' ? confForm.materiais : [],
        kitItens: confForm.tipo === 'KIT' ? confForm.kitItens : [],
      }
      const url = editConfId ? `/api/precificacao/variacoes/${editConfId}` : '/api/precificacao/variacoes'
      const res = await fetch(url, { method: editConfId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowConf(null); setEditConfId(null); load()
    } catch (e: any) { alert(e.message) }
    finally { setSavingConf(false) }
  }

  async function deleteConf(id: string) {
    if (!confirm('Excluir esta configuração?')) return
    await fetch(`/api/precificacao/variacoes/${id}`, { method: 'DELETE' }); load()
  }

  function openEditConf(c: Config, produtoId: string) {
    setConfForm({
      tipo: c.tipo || 'UNITARIO', qtdKit: String(c.qtdKit),
      canal: (c as any).canal || 'shopee',
      subOpcao: (c as any).subOpcao || 'classico',
      tipoMaoObra: (c as any).tipoMaoObra || 'local',
      custoMaoObra: String(c.custoMaoObra),
      tipoArte: (c as any).tipoArte || 'local',
      custoArte: String(c.custoArte),
      custoEmbalagem: String(c.custoEmbalagem),
      custosAdicionais: (c as any).custosAdicionais || [],
      impostos: String(c.impostos || 0),
      precoVenda: c.precoVenda ? String(c.precoVenda) : '',
      materiais: c.materiais.map(m => ({ ...m, rendimento: (m as any).rendimento ?? 1 })),
      kitItens: (c.kitItens || []).map(k => ({ ...k })),
    })
    setEditConfId(c.id); setShowConf(produtoId)
  }

  const filtered = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
          <p className="text-gray-500 text-sm mt-1">Cadastro de produtos unitários e kits com precificação</p>
        </div>
        <button onClick={() => { setProdForm({ nome: '', sku: '', categoria: '' }); setEditProdId(null); setShowProd(true) }}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + Novo Produto
        </button>
      </div>

      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className={inputClass + ' max-w-sm mb-4'} />

      {/* Modal produto */}
      {showProd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editProdId ? 'Editar' : 'Novo'} Produto</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
                <input value={prodForm.nome} onChange={e => setProdForm(p => ({ ...p, nome: e.target.value }))} className={inputClass} placeholder="Ex: Laço Cetim Simples" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">SKU</label>
                  <input value={prodForm.sku} onChange={e => setProdForm(p => ({ ...p, sku: e.target.value }))} className={inputClass} placeholder="Opcional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                  <input value={prodForm.categoria} onChange={e => setProdForm(p => ({ ...p, categoria: e.target.value }))} className={inputClass} placeholder="Ex: Laços, Kits" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveProd} disabled={savingProd} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50">
                {savingProd ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setShowProd(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuração do Produto */}
      {showConf && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            {/* Header sticky */}
            <div className="sticky top-0 bg-white rounded-t-2xl px-6 pt-5 pb-3 border-b border-gray-100 z-10">
              <h2 className="text-lg font-bold text-gray-800">{editConfId ? 'Editar' : 'Nova'} Configuração do Produto</h2>
              <div className="flex gap-2 mt-3">
                {(['UNITARIO', 'KIT'] as const).map(t => (
                  <button key={t} onClick={() => setConfForm(p => ({ ...p, tipo: t }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                      confForm.tipo === t
                        ? t === 'KIT' ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-purple-50 border-purple-400 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {t === 'UNITARIO' ? '📦 Produto Unitário' : '🎁 Kit'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Quantidade */}
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {confForm.tipo === 'KIT' ? 'Quantidade de itens no Kit' : 'Quantidade produzida'}
                </label>
                <input type="number" min="1" value={confForm.qtdKit}
                  onChange={e => setConfForm(p => ({ ...p, qtdKit: e.target.value }))}
                  className={inputClass} placeholder="Ex: 30" />
              </div>

              {/* Canal de venda */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Canal de venda</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <select
                      value={confForm.canal}
                      onChange={e => setConfForm(p => ({ ...p, canal: e.target.value, subOpcao: 'classico' }))}
                      className={inputClass}
                    >
                      {CANAIS_LISTA.map(c => (
                        <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  {CANAIS_LISTA.find(c => c.key === confForm.canal)?.subs && (
                    <div className="flex-1">
                      <select
                        value={confForm.subOpcao}
                        onChange={e => setConfForm(p => ({ ...p, subOpcao: e.target.value }))}
                        className={inputClass}
                      >
                        {CANAIS_LISTA.find(c => c.key === confForm.canal)?.subs?.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {confForm.canal === 'shopee' && custoTotalCalc > 0 && (
                  <p className="text-xs text-purple-600 font-medium mt-1.5 bg-purple-50 px-3 py-1.5 rounded-lg">
                    📊 Faixa calculada automaticamente: {canalSel.label}
                  </p>
                )}
              </div>

              {/* UNITÁRIO: Materiais */}
              {confForm.tipo === 'UNITARIO' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">Materiais</p>
                    <button onClick={addMaterialItem} className="text-xs text-purple-600 hover:underline font-medium">+ Adicionar material</button>
                  </div>
                  {confForm.materiais.length === 0 && <p className="text-xs text-gray-400 italic px-1 mb-2">Nenhum material adicionado ainda.</p>}
                  {confForm.materiais.map((m, i) => (
                    <div key={i} className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Material</label>
                          <select value={m.materialId || ''} onChange={e => selectMaterial(i, e.target.value)} className={inputClass}>
                            <option value="">Selecionar do cadastro...</option>
                            {materiaisCad.map(mc => (
                              <option key={mc.id} value={mc.id}>{mc.nome} — R${Number(mc.precoUnidade).toLocaleString('pt-BR', {minimumFractionDigits:4,maximumFractionDigits:4})}/{mc.unidade}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <label className="block text-xs text-gray-400 mb-0.5">Qtd usada</label>
                          <input type="number" step="0.001" value={m.qtdUsada}
                            onChange={e => setConfForm(p => { const u = [...p.materiais]; u[i] = { ...u[i], qtdUsada: Number(e.target.value) }; return { ...p, materiais: u } })}
                            className={inputClass} />
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <label className="block text-xs text-gray-400 mb-0.5">R$/unid</label>
                          <input type="number" step="0.0001" value={m.custoUnit}
                            onChange={e => setConfForm(p => { const u = [...p.materiais]; u[i] = { ...u[i], custoUnit: Number(e.target.value) }; return { ...p, materiais: u } })}
                            className={inputClass} />
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <label className="block text-xs text-gray-400 mb-0.5 whitespace-nowrap" title="Quantos produtos saem desta quantidade de material">Rendimento</label>
                          <input type="number" step="0.01" min="0.01" value={m.rendimento ?? 1}
                            onChange={e => setConfForm(p => { const u = [...p.materiais]; u[i] = { ...u[i], rendimento: Number(e.target.value) }; return { ...p, materiais: u } })}
                            className={inputClass} />
                        </div>
                        <button onClick={() => removeMaterialItem(i)} className="text-red-400 hover:text-red-600 text-lg pb-1 flex-shrink-0">✕</button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-blue-600 font-medium">
                          {m.qtdUsada > 0 && m.custoUnit > 0 && (() => {
                            const custo = (Number(m.qtdUsada) * Number(m.custoUnit)) / Math.max(Number(m.rendimento) || 1, 0.0001)
                            const rend = Number(m.rendimento) || 1
                            return rend > 1
                              ? `R$ ${(Number(m.qtdUsada) * Number(m.custoUnit)).toLocaleString('pt-BR', {minimumFractionDigits:4,maximumFractionDigits:4})} ÷ ${rend} = R$ ${custo.toLocaleString('pt-BR', {minimumFractionDigits:4,maximumFractionDigits:4})} por produto`
                              : `= R$ ${custo.toLocaleString('pt-BR', {minimumFractionDigits:4,maximumFractionDigits:4})}`
                          })()}
                        </span>
                        <button onClick={() => { setNovoMatIdx(i); setShowNovoMat(true); setNovoMatForm({ nome: '', unidade: 'unidade', precoPacote: '', qtdPacote: '', fornecedor: '' }) }}
                          className="text-xs text-purple-500 hover:underline">+ Criar novo material</button>
                      </div>
                      {showNovoMat && novoMatIdx === i && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
                          <p className="text-xs font-semibold text-purple-700">Novo Material</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2">
                              <input value={novoMatForm.nome} onChange={e => setNovoMatForm(p => ({ ...p, nome: e.target.value }))}
                                className={inputClass} placeholder="Nome do material *" autoFocus />
                            </div>
                            <input type="number" step="0.01" value={novoMatForm.precoPacote}
                              onChange={e => setNovoMatForm(p => ({ ...p, precoPacote: e.target.value }))} className={inputClass} placeholder="Preço do pacote *" />
                            <input type="number" step="0.001" value={novoMatForm.qtdPacote}
                              onChange={e => setNovoMatForm(p => ({ ...p, qtdPacote: e.target.value }))} className={inputClass} placeholder="Qtd no pacote *" />
                            <select value={novoMatForm.unidade} onChange={e => setNovoMatForm(p => ({ ...p, unidade: e.target.value }))} className={inputClass}>
                              <option value="unidade">Unidade</option><option value="metros">Metros</option>
                              <option value="gramas">Gramas</option><option value="folha">Folha</option>
                              <option value="pacote">Pacote</option><option value="rolo">Rolo</option>
                            </select>
                            <input value={novoMatForm.fornecedor} onChange={e => setNovoMatForm(p => ({ ...p, fornecedor: e.target.value }))}
                              className={inputClass} placeholder="Fornecedor (opcional)" />
                          </div>
                          {novoMatForm.precoPacote && novoMatForm.qtdPacote && (
                            <p className="text-xs text-purple-600 font-medium">
                              R$/unidade: {fmt(Number(novoMatForm.precoPacote) / Number(novoMatForm.qtdPacote))}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => saveNovoMaterial(i)} disabled={savingNovoMat}
                              className="flex-1 bg-purple-600 text-white text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50">
                              {savingNovoMat ? '...' : 'Salvar e usar'}
                            </button>
                            <button onClick={() => setShowNovoMat(false)} className="flex-1 border text-gray-500 text-xs py-1.5 rounded-lg">Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {custoMaterialCalc > 0 && (
                    <div className="bg-blue-50 rounded-lg px-3 py-1.5 text-xs text-blue-700 font-medium">
                      Custo de materiais: <strong>{fmt(custoMaterialCalc)}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* KIT: Produtos */}
              {confForm.tipo === 'KIT' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">Produtos do Kit</p>
                    <button onClick={addKitItem} className="text-xs text-orange-600 hover:underline font-medium">+ Adicionar produto</button>
                  </div>
                  {confForm.kitItens.length === 0 && <p className="text-xs text-gray-400 italic px-1 mb-2">Nenhum produto adicionado ao kit.</p>}
                  {confForm.kitItens.map((k, i) => (
                    <div key={i} className="mb-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Produto</label>
                          <select value={k.produtoId} onChange={e => selectProdutoKit(i, e.target.value)} className={inputClass}>
                            <option value="">Selecionar produto...</option>
                            {produtos.filter(p => p.configs.some(c => c.tipo === 'UNITARIO')).map(p => (
                              <option key={p.id} value={p.id}>{p.nome} {p.sku ? `(${p.sku})` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <label className="block text-xs text-gray-400 mb-0.5">Quantidade</label>
                          <input type="number" min="1" value={k.qtdItens}
                            onChange={e => setConfForm(p => { const u = [...p.kitItens]; u[i] = { ...u[i], qtdItens: Number(e.target.value) }; return { ...p, kitItens: u } })}
                            className={inputClass} />
                        </div>
                        <div className="w-24 flex-shrink-0">
                          <label className="block text-xs text-gray-400 mb-0.5">Custo/un</label>
                          <input type="number" step="0.0001" value={k.custoUnit}
                            onChange={e => setConfForm(p => { const u = [...p.kitItens]; u[i] = { ...u[i], custoUnit: Number(e.target.value) }; return { ...p, kitItens: u } })}
                            className={inputClass} />
                        </div>
                        <button onClick={() => removeKitItem(i)} className="text-red-400 hover:text-red-600 text-lg pb-1 flex-shrink-0">✕</button>
                      </div>
                      {k.qtdItens > 0 && k.custoUnit > 0 && (
                        <p className="text-xs text-orange-600 font-medium mt-1">= {fmt(k.qtdItens * k.custoUnit)}</p>
                      )}
                    </div>
                  ))}
                  {custoKitCalc > 0 && (
                    <div className="bg-orange-50 rounded-lg px-3 py-1.5 text-xs text-orange-700 font-medium">
                      Custo dos produtos: <strong>{fmt(custoKitCalc)}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Custos adicionais */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Custos Adicionais</p>

                {/* Mão de obra */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Mão de obra</label>
                  <div className="flex gap-2 mb-2">
                    {(['local', 'freelancer'] as const).map(t => (
                      <button key={t} onClick={() => setConfForm(p => ({ ...p, tipoMaoObra: t, custoMaoObra: t === 'local' ? '0' : p.custoMaoObra } as any))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                          (confForm as any).tipoMaoObra === t
                            ? 'bg-purple-50 border-purple-400 text-purple-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        {t === 'local' ? '🏠 Local (gratuito)' : '👤 Freelancer'}
                      </button>
                    ))}
                  </div>
                  {(confForm as any).tipoMaoObra === 'freelancer' ? (
                    <input type="number" step="0.01" value={confForm.custoMaoObra}
                      onChange={e => setConfForm(p => ({ ...p, custoMaoObra: e.target.value }))}
                      className={inputClass} placeholder="Valor pago ao freelancer (R$)" />
                  ) : (
                    <p className="text-xs text-gray-400 italic px-1">Mão de obra própria — custo R$ 0,00</p>
                  )}
                </div>

                {/* Arte */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Arte / Design</label>
                  <div className="flex gap-2 mb-2">
                    {(['local', 'freelancer'] as const).map(t => (
                      <button key={t} onClick={() => setConfForm(p => ({ ...p, tipoArte: t, custoArte: t === 'local' ? '0' : p.custoArte } as any))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                          (confForm as any).tipoArte === t
                            ? 'bg-purple-50 border-purple-400 text-purple-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        {t === 'local' ? '🏠 Local (gratuito)' : '👤 Freelancer'}
                      </button>
                    ))}
                  </div>
                  {(confForm as any).tipoArte === 'freelancer' ? (
                    <input type="number" step="0.01" value={confForm.custoArte}
                      onChange={e => setConfForm(p => ({ ...p, custoArte: e.target.value }))}
                      className={inputClass} placeholder="Valor pago ao freelancer de arte (R$)" />
                  ) : (
                    <p className="text-xs text-gray-400 italic px-1">Arte própria — custo R$ 0,00</p>
                  )}
                </div>

                {/* Embalagem */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Embalagem (R$)</label>
                  <input type="number" step="0.01" value={confForm.custoEmbalagem}
                    onChange={e => setConfForm(p => ({ ...p, custoEmbalagem: e.target.value }))}
                    className={inputClass} placeholder="0,00" />
                </div>

                {/* Custos adicionais livres */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-500">Outros custos</label>
                    <button
                      onClick={() => setConfForm(p => ({ ...p, custosAdicionais: [...((p as any).custosAdicionais || []), { descricao: '', valor: '' }] } as any))}
                      className="text-xs text-purple-600 hover:underline">
                      + Adicionar custo
                    </button>
                  </div>
                  {((confForm as any).custosAdicionais || []).map((c: any, i: number) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={c.descricao}
                        onChange={e => setConfForm(p => { const u = [...(p as any).custosAdicionais]; u[i] = { ...u[i], descricao: e.target.value }; return { ...p, custosAdicionais: u } as any })}
                        className={inputClass} placeholder="Descrição (ex: frete, taxa, etc.)" />
                      <div className="w-32 flex-shrink-0">
                        <input type="number" step="0.01" value={c.valor}
                          onChange={e => setConfForm(p => { const u = [...(p as any).custosAdicionais]; u[i] = { ...u[i], valor: e.target.value }; return { ...p, custosAdicionais: u } as any })}
                          className={inputClass} placeholder="R$" />
                      </div>
                      <button onClick={() => setConfForm(p => ({ ...p, custosAdicionais: (p as any).custosAdicionais.filter((_: any, j: number) => j !== i) } as any))}
                        className="text-red-400 hover:text-red-600 text-lg flex-shrink-0">✕</button>
                    </div>
                  ))}
                  {custoAdicionalTotal > 0 && (
                    <p className="text-xs text-gray-500 font-medium">Total outros custos: {fmt(custoAdicionalTotal)}</p>
                  )}
                </div>
              </div>

              {/* Custo total */}
              <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-700">Custo total de produção</span>
                  <span className="text-xl font-bold text-green-700">{fmt(custoTotalCalc)}</span>
                </div>
                {Number(confForm.qtdKit) > 1 && custoTotalCalc > 0 && (
                  <p className="text-xs text-green-600 mt-0.5">{fmt(custoTotalCalc / Number(confForm.qtdKit))} por unidade</p>
                )}
              </div>

              {/* Impostos */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-700">Impostos (R$)</label>
                  <div className="flex gap-3">
                    <a href="https://claude.ai" target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline">💬 Oráculo Contábil</a>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <input type="number" step="0.01" value={confForm.impostos}
                    onChange={e => setConfForm(p => ({ ...p, impostos: e.target.value }))}
                    className={inputClass} placeholder="Ex: 9.50 — valor do imposto sobre o produto" />
                  {aliquotaPadrao !== null && aliquotaPadrao > 0 && custoTotalCalc > 0 && (
                    <button
                      onClick={() => setConfForm(p => ({ ...p, impostos: (custoTotalCalc * aliquotaPadrao / 100).toFixed(2) }))}
                      className="flex-shrink-0 text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded-lg whitespace-nowrap"
                      title={`Calcular ${aliquotaPadrao}% sobre o custo total`}
                    >
                      Calcular {aliquotaPadrao}%
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Inclua o valor estimado de impostos (Simples Nacional, MEI, etc.)
                  {aliquotaPadrao !== null && aliquotaPadrao > 0 && (
                    <span className="ml-1 text-blue-500">· Regime configurado: {aliquotaPadrao}%</span>
                  )}
                </p>
              </div>

              {/* Sugestões de preço */}
              {custoTotalCalc > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-700">
                      Sugestões de preço
                      <span className="text-xs text-gray-400 font-normal ml-2">(clique para usar)</span>
                    </p>
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {canalSel.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'Margem baixa',    margem: 0.15, valor: precoBaixo,    cor: 'border-yellow-200 bg-yellow-50 text-yellow-800', corMargem: 'text-yellow-700' },
                      { label: 'Margem saudável', margem: 0.30, valor: precoSaudavel, cor: 'border-green-200 bg-green-50 text-green-800',   corMargem: 'text-green-700'  },
                      { label: 'Margem alta',     margem: 0.45, valor: precoAlto,     cor: 'border-blue-200 bg-blue-50 text-blue-800',      corMargem: 'text-blue-700'   },
                    ].map(({ label, margem, valor, cor, corMargem }) => {
                      const margemRS = valor ? valor * margem : null
                      return (
                        <button key={label}
                          onClick={() => valor && setConfForm(p => ({ ...p, precoVenda: valor.toFixed(2) }))}
                          className={`p-3 rounded-xl border-2 text-left transition-all hover:opacity-80 active:scale-95 ${cor} ${confForm.precoVenda === valor?.toFixed(2) ? 'ring-2 ring-purple-400' : ''}`}>
                          <p className="text-xs font-semibold">{label}</p>
                          <p className="font-bold text-base mt-1">{valor ? fmt(valor) : '—'}</p>
                          <div className={`mt-1.5 pt-1.5 border-t border-current border-opacity-20 ${corMargem}`}>
                            <p className="text-xs font-bold">{(margem * 100).toFixed(0)}% · {margemRS ? fmt(margemRS) : '—'}</p>
                            <p className="text-xs opacity-60">margem bruta</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Preço de venda
                      <span className="text-purple-400 ml-1">← selecione uma sugestão ou digite</span>
                    </label>
                    <input type="number" step="0.01" value={confForm.precoVenda}
                      onChange={e => setConfForm(p => ({ ...p, precoVenda: e.target.value }))}
                      className={inputClass + ' font-bold text-green-700'} placeholder="0,00" />
                    {confForm.precoVenda && custoTotalCalc > 0 && (() => {
                      const preco   = Number(confForm.precoVenda)
                      const taxas   = preco * canalSel.taxa + canalSel.fixo
                      const margem  = ((preco - custoTotalCalc - impostosVal - taxas) / preco) * 100
                      const margemRS = preco - custoTotalCalc - impostosVal - taxas
                      const cor     = margem >= 25 ? 'text-green-600 bg-green-50 border-green-200'
                                    : margem >= 15 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                                    : 'text-red-600 bg-red-50 border-red-200'
                      return (
                        <div className={`mt-2 px-3 py-2 rounded-xl border ${cor} flex items-center justify-between`}>
                          <div>
                            <p className="text-xs font-medium opacity-70">Margem bruta com {canalSel.label}</p>
                            <p className="text-xs opacity-60 mt-0.5">Descontando custo + impostos + taxas do canal</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg leading-tight">{margem.toFixed(1)}%</p>
                            <p className="text-sm font-semibold">{fmt(margemRS)}</p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => saveConf(showConf!)} disabled={savingConf}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
                  {savingConf ? 'Salvando...' : 'Salvar Configuração'}
                </button>
                <button onClick={() => { setShowConf(null); setEditConfId(null) }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          {busca ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{expanded === p.id ? '▼' : '▶'}</span>
                  <div>
                    <p className="font-semibold text-gray-800">{p.nome}</p>
                    <p className="text-xs text-gray-400">
                      {p.sku && <span className="font-mono mr-2">{p.sku}</span>}
                      {p.categoria && <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full mr-2">{p.categoria}</span>}
                      <span>{p.configs?.length || 0} configuração(ões)</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={e => { e.stopPropagation(); setProdForm({ nome: p.nome, sku: p.sku||'', categoria: p.categoria||'' }); setEditProdId(p.id); setShowProd(true) }}
                    className="text-xs text-blue-500 hover:underline px-2">Editar</button>
                  <button onClick={e => { e.stopPropagation(); deleteProd(p.id) }}
                    className="text-xs text-red-500 hover:underline px-2">Excluir</button>
                  <button onClick={e => { e.stopPropagation(); setConfForm(EMPTY_CONFIG); setEditConfId(null); setShowConf(p.id) }}
                    className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700">
                    + Configuração
                  </button>
                </div>
              </div>

              {expanded === p.id && (
                <div className="border-t border-gray-50 overflow-x-auto">
                  {(!p.configs || p.configs.length === 0) ? (
                    <p className="px-5 py-4 text-gray-400 text-sm">Nenhuma configuração ainda. Clique em "+ Configuração".</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs">
                          <th className="px-4 py-2 text-left text-gray-500">Tipo</th>
                          <th className="px-4 py-2 text-left text-gray-500">Qtd</th>
                          <th className="px-4 py-2 text-right text-gray-500">Custo</th>
                          <th className="px-4 py-2 text-right text-gray-500">Impostos</th>
                          <th className="px-4 py-2 text-right text-gray-500">Preço venda</th>
                          <th className="px-4 py-2 text-right text-gray-500">Margem</th>
                          <th className="px-4 py-2 text-center text-gray-500">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.configs.map(c => {
                          const margem = c.precoVenda && Number(c.custoTotal) > 0
                            ? ((Number(c.precoVenda) - Number(c.custoTotal) - Number(c.impostos||0)) / Number(c.precoVenda) * 100)
                            : null
                          return (
                            <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/40">
                              <td className="px-4 py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.tipo === 'KIT' ? 'bg-orange-50 text-orange-700' : 'bg-purple-50 text-purple-700'}`}>
                                  {c.tipo === 'KIT' ? '🎁 Kit' : '📦 Unitário'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-medium text-gray-700">{c.qtdKit} un</td>
                              <td className="px-4 py-2.5 text-right text-gray-700">{fmt(Number(c.custoTotal))}</td>
                              <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{c.impostos ? fmt(Number(c.impostos)) : '—'}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-green-700">{c.precoVenda ? fmt(Number(c.precoVenda)) : '—'}</td>
                              <td className="px-4 py-2.5 text-right">
                                {margem !== null ? (
                                  <span className={`text-xs font-semibold ${margem >= 25 ? 'text-green-600' : margem >= 15 ? 'text-yellow-600' : 'text-red-500'}`}>
                                    {margem.toFixed(1)}%
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <div className="flex gap-2 justify-center">
                                  <button onClick={() => openEditConf(c, p.id)} className="text-xs text-blue-500 hover:underline">Editar</button>
                                  <button onClick={() => deleteConf(c.id)} className="text-xs text-red-500 hover:underline">Excluir</button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
