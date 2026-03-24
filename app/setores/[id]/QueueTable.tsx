'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Operador { id: string; name: string }

interface OrderItem {
    productName: string | null
  id: string
  variation: string | null
  bowType: string | null
  bowColor: string | null
  bowQty: number | null
  appliqueType: string | null
  appliqueQty: number | null
  totalItems: number | null
  quantity: number
  childName: string | null
}

interface ProductionResponsible { id: string; name: string }

interface WorkItem {
  id: string
  status: string
  sectorNotes: string | null
  createdAt: string
  dueDate: string | null
  checkLacos: boolean | null
  checkTags: boolean | null
  checkAdesivos: boolean | null
  productionResponsibleId: string | null
  productionResponsible: ProductionResponsible | null
  artResponsibleId: string | null
  artResponsible: ProductionResponsible | null
  responsible: { id: string; name: string } | null
  order: {
    id: string
    externalId: string | null
    buyerUsername: string | null
    recipientName: string
    productType: string | null
    theme: string | null
    notes: string | null
    dueDate: string | null
    productionType: string | null
    artType: string | null
    artStatus: string | null
    store: { name: string }
    items: OrderItem[]
  }
}

const STATUS_LABEL: Record<string, string> = {
  TODO: 'Aguardando', DOING: 'Em andamento', DONE: 'Concluído',
}
const STATUS_COLOR: Record<string, string> = {
  TODO: 'bg-yellow-100 text-yellow-700',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700',
}
const ART_STATUS_LABEL: Record<string, string> = {
  APROVADO: 'Aprovado', ARTE_IGUAL: 'Arte Igual',
  ARTE_CLIENTE: 'Arte Cliente', PRODUZIDO_SEM_APROVACAO: 'Prod. s/ Aprov.',
  EM_APROVACAO: 'Em Aprovacao', REPLICAR_ARTE: 'Replicar Arte',
  ALTERAR: 'Alterar',
}
const ART_STATUS_COLOR: Record<string, string> = {
  APROVADO:               'bg-green-100 text-green-700',
  ARTE_IGUAL:             'bg-blue-100 text-blue-700',
  ARTE_CLIENTE:           'bg-yellow-100 text-yellow-700',
  PRODUZIDO_SEM_APROVACAO:'bg-red-100 text-red-600',
  EM_APROVACAO:           'bg-orange-100 text-orange-700',
  REPLICAR_ARTE:          'bg-purple-100 text-purple-700',
  ALTERAR:                'bg-rose-100 text-rose-700',
}

const PROD_LABEL: Record<string, string> = {
  EXTERNA: 'Produção Externa', INTERNA: 'Produção Interna', PRONTA_ENTREGA: 'Pronta Entrega',
}
const BOW_LABEL: Record<string, string> = {
  NONE: '', SIMPLE: 'Simples', LUXURY: 'Luxo',
}
const APPLIQUE_LABEL: Record<string, string> = {
  NONE: '', SIMPLE: 'Simples', THREE_D: '3D', THREE_D_LUX: '3D Luxo',
}

const BOW_COLOR_MAP: Record<string, string> = {
  'AMARELO BEBE': '#fef08a',
  'AMARELO OURO': '#d97706',
  'AZUL BEBE': '#bfdbfe',
  'AZUL ROYAL': '#1d4ed8',
  'DOURADO': '#ca8a04',
  'LARANJA': '#f97316',
  'LILAS': '#c084fc',
  'MARROM': '#92400e',
  'PINK': '#ec4899',
  'PRETO': '#1e293b',
  'ROSA BEBE': '#fbcfe8',
  'ROSE': '#fb7185',
  'ROXO': '#a855f7',
  'VERDE': '#22c55e',
  'VERDE AGUA': '#2dd4bf',
  'VERDE MUSGO': '#4d7c0f',
  'VERMELHO': '#ef4444',
}

const SETORES_DEVOLUCAO = [
  { stepId: 'step_arte',      label: 'Arte' },
  { stepId: 'step_arquivo',   label: 'Arquivo de Impressão' },
  { stepId: 'step_impressao', label: 'Impressão' },
  { stepId: 'step_prod_ext',  label: 'Produção Externa' },
  { stepId: 'step_prod_int',  label: 'Produção Interna' },
  { stepId: 'step_pronta',    label: 'Pronta Entrega' },
  { stepId: 'step_expedicao', label: 'Expedição' },
]

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "—"
    const day   = String(d.getUTCDate()).padStart(2, "0")
    const month = String(d.getUTCMonth() + 1).padStart(2, "0")
    const year  = String(d.getUTCFullYear())
    return day + "/" + month + "/" + year
  } catch (e) {
    return "—"
  }
}

function BowColorBadge({ color }: { color: string | null }) {
  if (!color) return null
  const upper = color.toUpperCase().trim()
  const hex = BOW_COLOR_MAP[upper]
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
      <span
        className="w-2.5 h-2.5 rounded-full border border-gray-300 flex-shrink-0"
        style={{ backgroundColor: hex ?? '#e5e7eb' }}
      />
      {color}
    </span>
  )
}

export default function QueueTable({
  workItems,
  operadores,
  departmentId,
  responsaveisProducao = [],
}: {
  workItems: WorkItem[]
  operadores: Operador[]
  departmentId: string
  responsaveisProducao?: { id: string; name: string }[]
}) {
  const isArteSector = departmentId === 'dep_arte'
  // ── NOVO: identifica o setor de Impressão ────────────────────────────────
  const isImpressaoSector  = departmentId === 'dep_impressao'
  const isSeparacaoSector  = departmentId === 'dep_separacao'
  const router = useRouter()
  const { data: session } = useSession()
  const role = session?.user?.role

  const [assigningId, setAssigningId]       = useState<string | null>(null)
  const [selectedResp, setSelectedResp]     = useState<string>('')
  const [selectedProdType, setSelectedProdType] = useState<string>('')
  const [loadingId, setLoadingId]           = useState<string | null>(null)
  const [revertItem, setRevertItem]         = useState<WorkItem | null>(null)
  const [revertStepId, setRevertStepId]     = useState('')
  const [revertMotivo, setRevertMotivo]     = useState('')
  const [revertLoading, setRevertLoading]   = useState(false)
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null)
  const [dueDateValue, setDueDateValue]     = useState<string>('')
  const [savingDueDate, setSavingDueDate]   = useState(false)
  const [editingArtStatus, setEditingArtStatus] = useState<string | null>(null)
  const [artStatusValue, setArtStatusValue]     = useState<string>('')
  const [savingArtStatus, setSavingArtStatus]   = useState(false)
  // Estado local para responsável de produção com botão salvar
  const [localProdResp, setLocalProdResp]     = useState<Record<string, string | null>>({})
  const [savingProdRespId, setSavingProdRespId] = useState<string | null>(null)
  const [localArtResp, setLocalArtResp]         = useState<Record<string, string | null>>({})
  const [savingArtRespId, setSavingArtRespId]   = useState<string | null>(null)
  // Checklist estado local para setor Separação
  const [localChecklist, setLocalChecklist] = useState<Record<string, { lacos: boolean; tags: boolean; adesivos: boolean }>>({})
  const [savingChecklistId, setSavingChecklistId] = useState<string | null>(null)

  async function handleSaveProdResp(itemId: string) {
    const newVal = localProdResp[itemId] !== undefined ? localProdResp[itemId] : null
    setSavingProdRespId(itemId)
    try {
      await fetch('/api/work-items/bulk-prod-resp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemIds: [itemId], productionResponsibleId: newVal }),
      })
      router.refresh()
    } finally {
      setSavingProdRespId(null)
    }
  }

  async function handleSaveChecklist(itemId: string) {
    setSavingChecklistId(itemId)
    const cl = localChecklist[itemId] ?? { lacos: false, tags: false, adesivos: false }
    try {
      await fetch(`/api/work-items/${itemId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkLacos: cl.lacos, checkTags: cl.tags, checkAdesivos: cl.adesivos }),
      })
      router.refresh()
    } finally {
      setSavingChecklistId(null)
    }
  }

  async function handleSaveArtResp(itemId: string) {
    const newVal = localArtResp[itemId] !== undefined ? localArtResp[itemId] : null
    setSavingArtRespId(itemId)
    try {
      await fetch('/api/work-items/bulk-prod-resp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemIds: [itemId], artResponsibleId: newVal }),
      })
      router.refresh()
    } finally {
      setSavingArtRespId(null)
    }
  }
  const [filterResponsavel, setFilterResponsavel] = useState('')
  const [filterProdResp, setFilterProdResp]       = useState('')
  const [filterArtResp, setFilterArtResp]         = useState('')
  const [filterDevolvido, setFilterDevolvido]     = useState(false)
  const [filterEstoqueInsuf, setFilterEstoqueInsuf] = useState(false)
  const [filterSemData, setFilterSemData]           = useState(false)
  const [filterSemProdResp, setFilterSemProdResp]   = useState(false)
  const [filterSemArtResp, setFilterSemArtResp]     = useState(false)
  const [filterBowColor, setFilterBowColor]       = useState('')
  const [filterBowType, setFilterBowType]         = useState('')
  const [filterLoja, setFilterLoja]               = useState('')
  const [filterProdType, setFilterProdTipo]       = useState('')
  const [filterArtStatus, setFilterArtStatus]     = useState('')
  const [filterDueDate, setFilterDueDate]         = useState('')

  const isAdmin = role === 'ADMIN'

  // ── Seleção em massa ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const [bulkResp, setBulkResp]           = useState<string>('')
  const [bulkAssigning, setBulkAssigning]   = useState(false)
  const [bulkDueDate, setBulkDueDate]       = useState('')
  const [savingBulkDue, setSavingBulkDue]   = useState(false)
  const [bulkProdResp, setBulkProdResp]     = useState('')
  const [savingProdResp, setSavingProdResp] = useState(false)
  const [bulkArtResp, setBulkArtResp]       = useState('')
  const [savingArtResp, setSavingArtResp]   = useState(false)

  async function handleBulkArtResp() {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    setSavingArtResp(true)
    try {
      await fetch('/api/work-items/bulk-prod-resp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemIds: ids, artResponsibleId: bulkArtResp || null }),
      })
      setSelectedIds(new Set())
      setBulkArtResp('')
      router.refresh()
    } finally {
      setSavingArtResp(false)
    }
  }

  async function handleBulkProdResp() {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    setSavingProdResp(true)
    try {
      await fetch('/api/work-items/bulk-prod-resp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemIds: ids, productionResponsibleId: bulkProdResp || null }),
      })
      setSelectedIds(new Set())
      setBulkProdResp('')
      router.refresh()
    } finally {
      setSavingProdResp(false)
    }
  }

  async function handleBulkDueDate() {
    const ids = Array.from(selectedIds)
    if (!ids.length || !bulkDueDate) return
    setSavingBulkDue(true)
    try {
      await fetch('/api/work-items/bulk-due-date', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemIds: ids, dueDate: bulkDueDate }),
      })
      setSelectedIds(new Set())
      setBulkDueDate('')
      router.refresh()
    } finally {
      setSavingBulkDue(false)
    }
  }

  // allIds, allSelected, someSelected, totalItemsSelected definidos abaixo após filtered

  function toggleOneCard(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllCards() {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        allIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        allIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  async function handleBulkTransition(action: 'advance') {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    setBulkAssigning(true)
    try {
      await Promise.all(ids.map(workItemId =>
        fetch(`/api/work-items/${workItemId}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
      ))
      setSelectedIds(new Set())
      router.refresh()
    } finally {
      setBulkAssigning(false)
    }
  }

  async function handleBulkAssign() {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    setBulkAssigning(true)
    try {
      await Promise.all(ids.map(workItemId =>
        fetch(`/api/work-items/${workItemId}/assign`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responsibleId: bulkResp || null }),
        })
      ))
      setSelectedIds(new Set())
      setBulkResp('')
      router.refresh()
    } finally {
      setBulkAssigning(false)
    }
  }

  async function handleSaveDueDate(workItemId: string) {
    setSavingDueDate(true)
    try {
      await fetch(`/api/work-items/${workItemId}/due-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: dueDateValue || null }),
      })
      setEditingDueDate(null)
      router.refresh()
    } finally {
      setSavingDueDate(false)
    }
  }

  const canManage = role === 'ADMIN' || role === 'DELEGADOR'

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterEnvio, setFilterEnvio]   = useState('')
  const [filterEntrada, setFilterEntrada] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return workItems.filter(item => {
      const oi = item.order.items[0]
      if (q) {
        const bowTypeLabel: Record<string, string> = {
          NONE: 'sem laco', SIMPLE: 'simples', LUXURY: 'luxo'
        }
        const appliqueLabel: Record<string, string> = {
          NONE: 'sem aplique', SIMPLE: 'simples', THREE_D: '3d', THREE_D_LUX: '3d luxo'
        }
        const match =
          item.order.externalId?.toLowerCase().includes(q)              ||
          item.order.buyerUsername?.toLowerCase().includes(q)           ||
          item.order.recipientName.toLowerCase().includes(q)            ||
          item.order.theme?.toLowerCase().includes(q)                   ||
          item.order.artType?.toLowerCase().includes(q)                 ||
          oi?.childName?.toLowerCase().includes(q)                      ||
          oi?.bowColor?.toLowerCase().includes(q)                       ||
          oi?.productName?.toLowerCase().includes(q)                    ||
          (oi?.bowType     ? bowTypeLabel[oi.bowType]?.includes(q)     : false) ||
          (oi?.appliqueType ? appliqueLabel[oi.appliqueType]?.includes(q) : false)
        if (!match) return false
      }
      if (filterStatus && item.status !== filterStatus) return false
      if (filterResponsavel && item.responsible?.id !== filterResponsavel) return false
      if (filterProdResp && item.productionResponsibleId !== filterProdResp) return false
      if (filterArtResp && item.artResponsibleId !== filterArtResp) return false
      if (filterDevolvido && !item.sectorNotes?.startsWith('[DEVOLVIDO]')) return false
      if (filterEstoqueInsuf && !item.sectorNotes?.includes('[ESTOQUE_INSUFICIENTE]')) return false
      if (filterSemData && item.dueDate) return false
      if (filterSemProdResp && item.productionResponsibleId) return false
      if (filterSemArtResp && item.artResponsibleId) return false
      if (filterBowColor) {
        const hasColor = item.order.items.some(
          (oi: any) => oi.bowColor?.toUpperCase().trim() === filterBowColor
        )
        if (!hasColor) return false
      }
      if (filterBowType && item.order.items[0]?.bowType !== filterBowType) return false
      if (filterLoja && item.order.store.name !== filterLoja) return false
      if (filterProdType && item.order.productionType !== filterProdType) return false
      if (filterArtStatus && item.order.artStatus !== filterArtStatus) return false
      if (filterDueDate) {
        if (!item.dueDate) return false
        const d = item.dueDate.includes('T')
          ? item.dueDate.split('T')[0]
          : item.dueDate
        if (d !== filterDueDate) return false
      }
      if (filterEnvio && item.order.dueDate) {
        const d = item.order.dueDate.includes('T')
          ? item.order.dueDate.split('T')[0]
          : item.order.dueDate
        if (d !== filterEnvio) return false
      }
      if (filterEntrada) {
        const d = item.createdAt.includes('T')
          ? item.createdAt.split('T')[0]
          : item.createdAt
        if (d !== filterEntrada) return false
      }
      return true
    })
  }, [workItems, search, filterStatus, filterEnvio, filterEntrada, filterResponsavel, filterProdResp, filterArtResp, filterDevolvido, filterEstoqueInsuf, filterSemData, filterSemProdResp, filterSemArtResp, filterBowType, filterLoja, filterProdType, filterArtStatus, filterDueDate, filterBowColor])

  const hasFilter = !!(search || filterStatus || filterEnvio || filterEntrada || filterResponsavel || filterProdResp || filterArtResp || filterDevolvido || filterEstoqueInsuf || filterSemData || filterSemProdResp || filterSemArtResp || filterBowType || filterLoja || filterProdType || filterArtStatus || filterDueDate || filterBowColor)
  const inputClass = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"

  // Derivados de filtered — definidos aqui pois dependem do useMemo acima
  const allIds       = filtered.map(i => i.id)
  const allSelected  = allIds.length > 0 && allIds.every(id => selectedIds.has(id))
  const someSelected = selectedIds.size > 0

  const totalItemsSelected = filtered
    .filter(i => selectedIds.has(i.id))
    .reduce((sum, i) => sum + (i.order.items[0]?.totalItems ?? 0), 0)

  // Soma de laços da cor filtrada — considera todos os itens do pedido
  const totalBowColorSelected = filterBowColor
    ? filtered
        .filter(i => selectedIds.has(i.id))
        .reduce((sum, wi) => sum + wi.order.items
          .filter((oi: any) => oi.bowColor?.toUpperCase().trim() === filterBowColor)
          .reduce((s: number, oi: any) => s + (oi.bowQty ?? 0), 0), 0)
    : 0

  // ── NOVO: soma de apliques dos itens selecionados (usado no setor Impressão) ──
  const totalAppliqueSelected = filtered
    .filter(i => selectedIds.has(i.id))
    .reduce((sum, wi) => sum + wi.order.items
      .reduce((s: number, oi: any) => s + (oi.appliqueQty ?? 0), 0), 0)


  // ── Agrupamento para setor Separação de Demanda ────────────────────────────
  const BOW_TYPE_LABEL_SEP: Record<string, string> = { SIMPLE: 'Simples', LUXURY: 'Luxo' }
  const groupedSeparacao = isSeparacaoSector
    ? Object.values(
        filtered.reduce((acc, item) => {
          const respId   = item.productionResponsibleId ?? 'sem_responsavel'
          const respName = item.productionResponsible?.name ?? 'Sem responsável'
          if (!acc[respId]) {
            acc[respId] = { respId, respName, items: [], bowSummary: {} as Record<string, { cor: string; tipo: string; quantidade: number }>, totalItems: 0 }
          }
          acc[respId].items.push(item)
          // Soma laços de todos os itens do pedido
          for (const oi of item.order.items) {
            if (!oi.bowColor || !oi.bowQty || oi.bowType === 'NONE') continue
            const key = `${oi.bowColor}__${oi.bowType}`
            if (!acc[respId].bowSummary[key]) acc[respId].bowSummary[key] = { cor: oi.bowColor, tipo: oi.bowType as string, quantidade: 0 }
            acc[respId].bowSummary[key].quantidade += oi.bowQty
          }
          acc[respId].totalItems += (item.order.items[0]?.totalItems ?? 0)
          return acc
        }, {} as Record<string, any>)
      ).map(g => ({ ...g, bowSummaryList: Object.values(g.bowSummary) }))
    : []

  // Checklist local por grupo (respId)
  const [groupChecklist, setGroupChecklist] = useState<Record<string, { lacos: boolean; tags: boolean; adesivos: boolean }>>({})
  const [completingGroup, setCompletingGroup] = useState<string | null>(null)

  async function handleCompleteGroup(respId: string, itemIds: string[]) {
    setCompletingGroup(respId)
    try {
      // Salva checklist em todos os workItems do grupo
      const cl = groupChecklist[respId] ?? { lacos: false, tags: false, adesivos: false }
      await Promise.all(itemIds.map(wid =>
        fetch(`/api/work-items/${wid}/checklist`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkLacos: cl.lacos, checkTags: cl.tags, checkAdesivos: cl.adesivos }),
        })
      ))
      // Avança todos para Produção Externa
      await Promise.all(itemIds.map(wid =>
        fetch(`/api/work-items/${wid}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'advance' }),
        })
      ))
      router.refresh()
    } finally {
      setCompletingGroup(null)
    }
  }

  async function handleAssign(workItemId: string) {
    setLoadingId(workItemId)
    try {
      await fetch(`/api/work-items/${workItemId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsibleId: selectedResp || null }),
      })
      setAssigningId(null)
      setSelectedResp('')
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function handleTransition(workItemId: string) {
    setLoadingId(workItemId)
    try {
      await fetch(`/api/work-items/${workItemId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      })
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function handleSaveArtStatus(orderId: string) {
    setSavingArtStatus(true)
    try {
      await fetch(`/api/orders/${orderId}/art-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artStatus: artStatusValue || null }),
      })
      setEditingArtStatus(null)
      router.refresh()
    } finally {
      setSavingArtStatus(false)
    }
  }

  async function handleRevert() {
    if (!revertItem || !revertStepId) return
    setRevertLoading(true)
    try {
      await fetch(`/api/work-items/${revertItem.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert', targetStepId: revertStepId, motivo: revertMotivo }),
      })
      setRevertItem(null)
      setRevertStepId('')
      setRevertMotivo('')
      router.refresh()
    } finally {
      setRevertLoading(false)
    }
  }

  const selectClass = "border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"

  return (
    <>
      {/* BARRA DE FILTROS */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end mb-4">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ID, nome, tema, produto, laço, aplique, criança..."
            className={`${inputClass} w-full`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="TODO">Aguardando</option>
            <option value="DOING">Em andamento</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Responsavel atribuido</label>
          <select value={filterResponsavel} onChange={e => setFilterResponsavel(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            {operadores.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>
        {responsaveisProducao.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Resp. producao</label>
            <select value={filterProdResp} onChange={e => setFilterProdResp(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {responsaveisProducao.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}
        {isArteSector && responsaveisProducao.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Resp. arte</label>
            <select value={filterArtResp} onChange={e => setFilterArtResp(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {responsaveisProducao.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data de envio</label>
          <input type="date" value={filterEnvio} onChange={e => setFilterEnvio(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data de entrada</label>
          <input type="date" value={filterEntrada} onChange={e => setFilterEntrada(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Laco</label>
          <select value={filterBowType} onChange={e => setFilterBowType(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="NONE">Sem laco</option>
            <option value="SIMPLE">Simples</option>
            <option value="LUXURY">Luxo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cor do Laco</label>
          <select value={filterBowColor} onChange={e => setFilterBowColor(e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            {Object.keys(BOW_COLOR_MAP).map(cor => (
              <option key={cor} value={cor}>{cor}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo Producao</label>
          <select value={filterProdType} onChange={e => setFilterProdTipo(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="EXTERNA">Externa</option>
            <option value="INTERNA">Interna</option>
            <option value="PRONTA_ENTREGA">Pronta Entrega</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status Arte</label>
          <select value={filterArtStatus} onChange={e => setFilterArtStatus(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="APROVADO">Aprovado</option>
            <option value="ARTE_IGUAL">Arte Igual</option>
            <option value="ARTE_CLIENTE">Arte Cliente</option>
            <option value="PRODUZIDO_SEM_APROVACAO">Prod. s/ Aprov.</option>
            <option value="EM_APROVACAO">Em Aprovacao</option>
            <option value="REPLICAR_ARTE">Replicar Arte</option>
            <option value="ALTERAR">Alterar</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Prev. entrega tarefa</label>
          <input type="date" value={filterDueDate} onChange={e => { setFilterDueDate(e.target.value); setFilterSemData(false) }} className={inputClass} />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            id="filterSemData"
            checked={filterSemData}
            onChange={e => { setFilterSemData(e.target.checked); if (e.target.checked) setFilterDueDate('') }}
            className="accent-purple-500 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="filterSemData" className="text-sm text-purple-600 font-medium cursor-pointer">
            Sem data definida
          </label>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            id="filterDevolvido"
            checked={filterDevolvido}
            onChange={e => setFilterDevolvido(e.target.checked)}
            className="accent-red-500 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="filterDevolvido" className="text-sm text-red-500 font-medium cursor-pointer">
            Somente devolvidos
          </label>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="filterEstoqueInsuf"
            checked={filterEstoqueInsuf}
            onChange={e => setFilterEstoqueInsuf(e.target.checked)}
            className="accent-orange-500 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="filterEstoqueInsuf" className="text-sm text-orange-600 font-medium cursor-pointer">
            Estoque insuficiente
          </label>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="filterSemProdResp"
            checked={filterSemProdResp}
            onChange={e => setFilterSemProdResp(e.target.checked)}
            className="accent-indigo-500 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="filterSemProdResp" className="text-sm text-indigo-600 font-medium cursor-pointer">
            Sem resp. produção
          </label>
        </div>
        {isArteSector && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="filterSemArtResp"
              checked={filterSemArtResp}
              onChange={e => setFilterSemArtResp(e.target.checked)}
              className="accent-pink-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="filterSemArtResp" className="text-sm text-pink-600 font-medium cursor-pointer">
              Sem resp. arte
            </label>
          </div>
        )}
        {hasFilter && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterEnvio(''); setFilterEntrada(''); setFilterResponsavel(''); setFilterProdResp(''); setFilterArtResp(''); setFilterDevolvido(false); setFilterEstoqueInsuf(false); setFilterSemData(false); setFilterSemProdResp(false); setFilterSemArtResp(false); setFilterBowType(''); setFilterLoja(''); setFilterProdTipo(''); setFilterArtStatus(''); setFilterDueDate(''); setFilterBowColor('') }}
            className="text-sm text-gray-400 hover:text-gray-600 px-2 py-2"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* CONTADOR */}
      <p className="text-xs text-gray-400 px-1 mb-3">
        {filtered.length} de {workItems.length} itens
      </p>

      {/* BARRA DE ATRIBUIÇÃO EM MASSA */}
      <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 mb-2">
          {/* Checkbox selecionar todos */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAllCards}
              className="accent-purple-600 w-4 h-4"
            />
            <span className="text-sm text-gray-600 font-medium">
              {someSelected ? `${selectedIds.size} selecionado(s)` : 'Selecionar todos'}
            </span>
          </label>

          {/* Soma de itens */}
          {someSelected && totalItemsSelected > 0 && (
            <span className="text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
              Total de itens: {totalItemsSelected}
            </span>
          )}
          {someSelected && filterBowColor && totalBowColorSelected > 0 && (
            <span className="text-sm font-bold text-pink-700 bg-pink-50 border border-pink-200 px-3 py-1 rounded-lg">
              Lacos {filterBowColor}: {totalBowColorSelected}
            </span>
          )}
          {/* ── NOVO: badge de soma de apliques — só aparece no setor Impressão ── */}
          {someSelected && isImpressaoSector && totalAppliqueSelected > 0 && (
            <span className="text-sm font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-lg">
              Total de apliques: {totalAppliqueSelected}
            </span>
          )}

          {/* Atribuir responsável em massa */}
          {someSelected && canManage && (
            <>
              <select
                value={bulkResp}
                onChange={e => setBulkResp(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">Atribuir responsável...</option>
                <option value="">Sem responsável</option>
                {operadores.map(op => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={bulkAssigning}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg disabled:opacity-50"
              >
                {bulkAssigning ? 'Atribuindo...' : 'Atribuir'}
              </button>
              <button
                onClick={() => { setSelectedIds(new Set()); setBulkResp('') }}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Cancelar
              </button>

          {/* Previsão de entrega em lote — só ADMIN */}
          {someSelected && isAdmin && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Prev. entrega tarefa:</label>
              <input
                type="date"
                value={bulkDueDate}
                onChange={e => setBulkDueDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              {bulkDueDate && (
                <button
                  onClick={handleBulkDueDate}
                  disabled={savingBulkDue}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {savingBulkDue ? '...' : 'Definir'}
                </button>
              )}
            </div>
          )}
            </>
          )}

          {/* Responsável produção em lote — só Arte, só ADMIN/DELEGADOR */}
          {someSelected && canManage && responsaveisProducao && responsaveisProducao.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Resp. produção:</label>
              <select
                value={bulkProdResp}
                onChange={e => setBulkProdResp(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">Sem responsável</option>
                {responsaveisProducao.filter(r => (r as any).active !== false).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkProdResp}
                disabled={savingProdResp}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {savingProdResp ? '...' : 'Atribuir'}
              </button>
            </div>
          )}
          {/* Responsável arte em lote — só setor Arte, só ADMIN/DELEGADOR */}
          {someSelected && canManage && isArteSector && responsaveisProducao && responsaveisProducao.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Resp. arte:</label>
              <select
                value={bulkArtResp}
                onChange={e => setBulkArtResp(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">Sem responsável</option>
                {responsaveisProducao.filter(r => (r as any).active !== false).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkArtResp}
                disabled={savingArtResp}
                className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {savingArtResp ? '...' : 'Atribuir'}
              </button>
            </div>
          )}

          {/* Iniciar / Concluir em massa — todos os usuários */}
          {someSelected && (
            <div className="flex items-center gap-2 ml-auto">
              {filtered.some(i => selectedIds.has(i.id) && i.status === 'TODO') && (
                <button
                  onClick={() => handleBulkTransition('advance')}
                  disabled={bulkAssigning}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {bulkAssigning ? '...' : 'Iniciar selecionados'}
                </button>
              )}
              {filtered.some(i => selectedIds.has(i.id) && i.status === 'DOING') && (
                <button
                  onClick={() => handleBulkTransition('advance')}
                  disabled={bulkAssigning}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {bulkAssigning ? '...' : 'Concluir selecionados'}
                </button>
              )}
            </div>
          )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
            {hasFilter ? 'Nenhum item encontrado com os filtros aplicados.' : 'Nenhum item na fila'}
          </div>
        )}

        {/* ── VIEW ESPECIAL: Separação de Demanda (agrupado por responsável) ── */}
        {isSeparacaoSector && groupedSeparacao.map((group: any) => {
          const cl = groupChecklist[group.respId] ?? { lacos: false, tags: false, adesivos: false }
          const allChecked = cl.lacos && cl.tags && cl.adesivos
          const itemIds = group.items.map((i: any) => i.id)
          return (
            <div key={group.respId} className="bg-white rounded-xl border border-orange-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header responsável */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {group.respName[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{group.respName}</p>
                      <p className="text-xs text-gray-400">{group.items.length} pedidos · {group.totalItems} itens no total</p>
                    </div>
                  </div>

                  {/* Resumo de laços */}
                  {group.bowSummaryList.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-3 ml-12">
                      {group.bowSummaryList.map((b: any) => {
                        const hexColor = BOW_COLOR_MAP[b.cor?.toUpperCase().trim()] ?? '#e5e7eb'
                        return (
                          <span key={`${b.cor}__${b.tipo}`} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl bg-white border-2 border-pink-100 text-gray-800 font-semibold shadow-sm">
                            <span
                              className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                              style={{ backgroundColor: hexColor }}
                            />
                            {b.cor} {BOW_TYPE_LABEL_SEP[b.tipo] ?? b.tipo}:
                            <span className="text-pink-700 font-bold text-base">{b.quantidade}</span>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Lista de pedidos */}
                  <div className="ml-12 mb-3 space-y-1">
                    {group.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-medium">{item.order.recipientName}</span>
                        {item.order.externalId && <span className="text-gray-400 font-mono">{item.order.externalId}</span>}
                        {item.order.items[0]?.totalItems != null && (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">{item.order.items[0].totalItems} itens</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Checklist */}
                  {canManage && (
                    <div className="ml-12">
                      <p className="text-xs font-semibold text-orange-600 mb-1.5">Checklist de separação:</p>
                      <div className="flex flex-col gap-1.5 mb-2">
                        {[
                          { key: 'lacos',    label: 'Separar laços' },
                          { key: 'tags',     label: 'Separar tags' },
                          { key: 'adesivos', label: 'Separar adesivos do cofre' },
                        ].map(chk => {
                          const val = (cl as any)[chk.key]
                          return (
                            <label key={chk.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={val}
                                onChange={e => setGroupChecklist(prev => ({
                                  ...prev,
                                  [group.respId]: { ...cl, [chk.key]: e.target.checked }
                                }))}
                                className="accent-orange-500 w-4 h-4"
                              />
                              <span className={`text-sm ${val ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                {chk.label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botão concluir grupo */}
                {canManage && (
                  <button
                    onClick={() => handleCompleteGroup(group.respId, itemIds)}
                    disabled={completingGroup === group.respId || !allChecked}
                    title={!allChecked ? 'Conclua o checklist primeiro' : `Enviar ${group.items.length} pedido(s) para Produção Externa`}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 flex-shrink-0"
                  >
                    {completingGroup === group.respId ? 'Enviando...' : 'Concluir'}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* ── VIEW NORMAL: todos os outros setores ── */}
        {!isSeparacaoSector && filtered.map(item => {
          const oi = item.order.items[0]
          return (
            <div key={item.id} className={`bg-white rounded-xl border p-4 transition-colors ${selectedIds.has(item.id) ? 'border-purple-300 bg-purple-50' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">

                  {/* Checkbox de seleção */}
                  <div className="flex items-center gap-2 mb-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleOneCard(item.id)}
                      className="accent-purple-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {/* Badges de status */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {item.order.store.name}
                    </span>
                    {item.order.productionType && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                        {PROD_LABEL[item.order.productionType]}
                      </span>
                    )}
                    {item.sectorNotes?.startsWith('[DEVOLVIDO]') && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                        Devolvido
                      </span>
                    )}
                    {item.sectorNotes?.includes('[ESTOQUE_INSUFICIENTE]') && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold border border-orange-300">
                        Estoque insuficiente de lacos!
                      </span>
                    )}
                  </div>

                  {/* ID Shopee + ID User */}
                  <div className="flex flex-wrap gap-3 mb-0.5">
                    {item.order.externalId && (
                      <p className="text-xs text-gray-400">Shopee: {item.order.externalId}</p>
                    )}
                    {item.order.buyerUsername && (
                      <p className="text-xs text-gray-400">User: {item.order.buyerUsername}</p>
                    )}
                  </div>

                  {/* Nome */}
                  <p className="font-semibold text-gray-800">{item.order.recipientName}</p>

                  {/* Produto + tema */}
                  <p className="text-sm text-gray-500">
                    {item.order.productType}
                    {item.order.theme && (
                      <> &middot; <span className="text-purple-600">{item.order.theme}</span></>
                    )}
                  </p>

                  {/* Nome e idade */}
                  {oi?.childName && (
                    <p className="text-sm font-bold text-blue-600 mt-0.5">{oi.childName}</p>
                  )}

                  {/* Responsável pela produção — só setor Arte */}


                  {/* Laço, aplique e qtd itens — linha de destaque */}
                  {item.order.items.map((bowItem: any, bowIdx: number) => (
                    (bowItem.bowType && bowItem.bowType !== 'NONE') || (bowItem.appliqueType && bowItem.appliqueType !== 'NONE') || bowItem.bowColor ? (
                      <div key={bowIdx} className="flex flex-wrap items-center gap-2 mt-1.5">
                        {/* Cor do laço */}
                        {bowItem.bowColor && <BowColorBadge color={bowItem.bowColor} />}

                        {/* Tipo + qtd laço */}
                        {bowItem.bowType && bowItem.bowType !== 'NONE' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-medium">
                            Laço {BOW_LABEL[bowItem.bowType]}
                            {bowItem.bowQty != null && (
                              <span className="ml-1 font-bold text-pink-800"> {bowItem.bowQty}</span>
                            )}
                          </span>
                        )}

                        {/* Tipo + qtd aplique */}
                        {bowItem.appliqueType && bowItem.appliqueType !== 'NONE' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-medium">
                            Aplique {APPLIQUE_LABEL[bowItem.appliqueType]}
                            {bowItem.appliqueQty != null && (
                              <span className="ml-1 font-bold text-orange-800"> {bowItem.appliqueQty}</span>
                            )}
                          </span>
                        )}
                      </div>
                    ) : null
                  ))}

                  {/* Qtd itens — destaque especial — sempre do primeiro item */}
                  {oi?.totalItems != null && (
                    <div className="mt-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-bold">
                        {oi.totalItems} itens
                      </span>
                    </div>
                  )}

                  {/* Datas — escondidas para OPERADOR */}
                  {canManage && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Entrada: {formatDate(item.createdAt)}{'  ·  '}
                      Envio: {formatDate(item.order.dueDate)}
                    </p>
                  )}

                  {/* Previsão de entrega do setor — editável só pelo ADMIN */}
                  <div className="mt-1.5 flex items-center gap-2">
                    {isAdmin && editingDueDate === item.id ? (
                      <>
                        <input
                          type="date"
                          value={dueDateValue}
                          onChange={e => setDueDateValue(e.target.value)}
                          className="border border-purple-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <button
                          onClick={() => handleSaveDueDate(item.id)}
                          disabled={savingDueDate}
                          className="text-xs bg-purple-600 text-white px-2 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {savingDueDate ? '...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditingDueDate(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          cancelar
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">
                          Prev. entrega:{' '}
                          {item.dueDate ? (
                            <span className="font-medium text-purple-700">
                              {formatDate(item.dueDate)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingDueDate(item.id)
                              setDueDateValue(
                                item.dueDate
                                  ? new Date(item.dueDate).toISOString().split('T')[0]
                                  : ''
                              )
                            }}
                            className="text-xs text-purple-500 hover:underline"
                          >
                            {item.dueDate ? 'Alterar' : 'Definir'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status da Arte — editavel no setor Arte */}
                  {isArteSector && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Status Arte:</span>
                      {editingArtStatus === item.id ? (
                        <>
                          <select
                            value={artStatusValue}
                            onChange={e => setArtStatusValue(e.target.value)}
                            className="border border-purple-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                          >
                            <option value="">-- Selecione --</option>
                            <option value="APROVADO">Aprovado</option>
                            <option value="ARTE_IGUAL">Arte Igual</option>
                            <option value="ARTE_CLIENTE">Arte Cliente</option>
                            <option value="PRODUZIDO_SEM_APROVACAO">Prod. s/ Aprovacao</option>
                            <option value="EM_APROVACAO">Em Aprovacao</option>
                            <option value="REPLICAR_ARTE">Replicar Arte</option>
                            <option value="ALTERAR">Alterar</option>
                          </select>
                          <button
                            onClick={() => handleSaveArtStatus(item.order.id)}
                            disabled={savingArtStatus}
                            className="text-xs bg-purple-600 text-white px-2 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            {savingArtStatus ? '...' : 'Salvar'}
                          </button>
                          <button onClick={() => setEditingArtStatus(null)} className="text-xs text-gray-400 hover:text-gray-600">cancelar</button>
                        </>
                      ) : (
                        <>
                          {item.order.artStatus ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ART_STATUS_COLOR[item.order.artStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                              {ART_STATUS_LABEL[item.order.artStatus] ?? item.order.artStatus}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">Nao definido</span>
                          )}
                          {canManage && (
                            <button
                              onClick={() => { setEditingArtStatus(item.id); setArtStatusValue(item.order.artStatus ?? '') }}
                              className="text-xs text-purple-500 hover:underline"
                            >
                              {item.order.artStatus ? 'Alterar' : 'Definir'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Observacoes */}
                  {item.order.notes && (
                    <p className="text-xs mt-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg inline-block">
                      Obs: {item.order.notes}
                    </p>
                  )}

                  {/* Motivo devolução */}
                  {item.sectorNotes?.startsWith('[DEVOLVIDO]') && (
                    <p className="text-xs mt-1.5 px-2 py-1 bg-red-50 text-red-600 rounded-lg inline-block">
                      {item.sectorNotes.replace('[DEVOLVIDO] ', '').replace('[DEVOLVIDO]', 'Sem motivo informado')}
                    </p>
                  )}

                  {/* Checklist — só no setor Separação de Demanda, só DELEGADOR/ADMIN */}
                  {isSeparacaoSector && canManage && (
                    <div className="mt-2 ml-0">
                      <p className="text-xs font-semibold text-orange-600 mb-1.5">Checklist de separação:</p>
                      <div className="flex flex-col gap-1.5">
                        {[
                          { key: 'lacos',    label: 'Separar laços' },
                          { key: 'tags',     label: 'Separar tags' },
                          { key: 'adesivos', label: 'Separar adesivos do cofre' },
                        ].map(chk => {
                          const cl = localChecklist[item.id] ?? {
                            lacos:    item.checkLacos    ?? false,
                            tags:     item.checkTags     ?? false,
                            adesivos: item.checkAdesivos ?? false,
                          }
                          const val = (cl as any)[chk.key]
                          return (
                            <label key={chk.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={val}
                                onChange={e => setLocalChecklist(prev => ({
                                  ...prev,
                                  [item.id]: { ...cl, [chk.key]: e.target.checked }
                                }))}
                                className="accent-orange-500 w-4 h-4"
                              />
                              <span className={`text-sm ${val ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                {chk.label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => handleSaveChecklist(item.id)}
                        disabled={savingChecklistId === item.id}
                        className="mt-2 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg disabled:opacity-50"
                      >
                        {savingChecklistId === item.id ? '...' : 'Salvar checklist'}
                      </button>
                    </div>
                  )}

                  {/* Responsável pela produção */}
                  {/* No setor Arte: ADMIN/DELEGADOR pode editar | Nos demais: só ADMIN pode alterar */}
                  {(isArteSector ? canManage : isAdmin) && responsaveisProducao.length > 0 ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Resp. produção:</span>
                      <select
                        value={localProdResp[item.id] !== undefined ? (localProdResp[item.id] ?? '') : (item.productionResponsibleId ?? '')}
                        onChange={e => {
                          const newVal = e.target.value || null
                          setLocalProdResp(prev => ({ ...prev, [item.id]: newVal }))
                        }}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                      >
                        <option value="">Sem responsável</option>
                        {responsaveisProducao.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSaveProdResp(item.id)}
                        disabled={savingProdRespId === item.id}
                        className="text-xs bg-purple-600 text-white px-2 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {savingProdRespId === item.id ? '...' : 'Salvar'}
                      </button>
                    </div>
                  ) : item.productionResponsible ? (
                    <p className="text-xs mt-1.5">
                      <span className="text-gray-400">Resp. produção: </span>
                      <span className="font-medium text-indigo-600">{item.productionResponsible.name}</span>
                    </p>
                  ) : null}

                  {/* Responsavel Arte — editavel somente no setor Arte por ADMIN/DELEGADOR */}
                  {isArteSector && canManage && responsaveisProducao.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Resp. arte:</span>
                      <select
                        value={localArtResp[item.id] !== undefined ? (localArtResp[item.id] ?? '') : (item.artResponsibleId ?? '')}
                        onChange={e => setLocalArtResp(prev => ({ ...prev, [item.id]: e.target.value || null }))}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="">Sem responsavel</option>
                        {responsaveisProducao.filter(r => (r as any).active !== false).map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSaveArtResp(item.id)}
                        disabled={savingArtRespId === item.id}
                        className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingArtRespId === item.id ? '...' : 'Salvar'}
                      </button>
                    </div>
                  )}
                  {/* Exibe resp arte em leitura nos demais setores */}
                  {!isArteSector && item.artResponsible && (
                    <p className="text-xs mt-1.5">
                      <span className="text-gray-400">Resp. arte: </span>
                      <span className="font-medium text-indigo-600">{item.artResponsible.name}</span>
                    </p>
                  )}

                  {/* Atribuição */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {canManage && assigningId === item.id ? (
                      <>
                        <select value={selectedResp} onChange={e => setSelectedResp(e.target.value)} className={selectClass}>
                          <option value="">Sem responsável</option>
                          {operadores.map(op => (
                            <option key={op.id} value={op.id}>{op.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(item.id)}
                          disabled={loadingId === item.id}
                          className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {loadingId === item.id ? '...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => { setAssigningId(null); setSelectedResp(''); setSelectedProdType('') }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        {item.responsible ? (
                          <span className="text-xs flex items-center gap-1 text-gray-600">
                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                              {item.responsible.name[0]}
                            </span>
                            {item.responsible.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Sem responsável</span>
                        )}
                        {canManage && (
                          <button
                            onClick={() => {
                              setAssigningId(item.id)
                              setSelectedResp(item.responsible?.id ?? '')
                              setSelectedProdType(item.order.productionType ?? '')
                            }}
                            className="text-xs text-purple-600 hover:underline"
                          >
                            {item.responsible ? 'Alterar' : 'Atribuir'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {item.status === 'TODO' && (
                    <button
                      onClick={() => handleTransition(item.id)}
                      disabled={loadingId === item.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {loadingId === item.id ? '...' : 'Iniciar'}
                    </button>
                  )}
                  {item.status === 'DOING' && (
                    <button
                      onClick={() => handleTransition(item.id)}
                      disabled={loadingId === item.id}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {loadingId === item.id ? '...' : 'Concluir'}
                    </button>
                  )}
                  {item.status !== 'DONE' && (
                    <button
                      onClick={() => { setRevertItem(item); setRevertStepId(''); setRevertMotivo('') }}
                      className="border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg"
                    >
                      Devolver
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL DEVOLVER */}
      {revertItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Devolver pedido</h2>
            <p className="text-sm text-gray-500 mb-4">
              {revertItem.order.recipientName} &mdash; {revertItem.order.productType}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Devolver para qual setor? *</label>
                <select
                  value={revertStepId}
                  onChange={e => setRevertStepId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">Selecione o setor...</option>
                  {SETORES_DEVOLUCAO.map(s => (
                    <option key={s.stepId} value={s.stepId}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Motivo</label>
                <input
                  type="text"
                  value={revertMotivo}
                  onChange={e => setRevertMotivo(e.target.value)}
                  placeholder="Ex: Nome impresso errado"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRevertItem(null)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm">
                Cancelar
              </button>
              <button
                onClick={handleRevert}
                disabled={!revertStepId || revertLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
              >
                {revertLoading ? 'Devolvendo...' : 'Confirmar devolução'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
