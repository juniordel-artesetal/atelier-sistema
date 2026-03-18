'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

interface PedidoPreview {
  externalId: string
  buyerUsername: string
  storeId: string
  recipientName: string
  dueDate: string
  productName: string
  variation: string
  quantity: number
  totalItems: number | null
  theme: string
  childName: string
  notes: string
  bowColor: string
  bowType: string
  bowQty: number | null
  appliqueType: string
  appliqueQty: number | null
  _valid: boolean
  _error: string
}

// ── Normaliza chave de coluna para lookup case-insensitive sem acento ────────
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// ── Cria mapa normalizado das colunas do Excel ───────────────────────────────
function buildColMap(row: any): Record<string, string> {
  const map: Record<string, string> = {}
  for (const key of Object.keys(row)) {
    map[normalizeKey(key)] = key
  }
  return map
}

// ── Busca valor da linha por lista de sinônimos (case-insensitive) ───────────
function getCol(row: any, colMap: Record<string, string>, ...synonyms: string[]): any {
  for (const s of synonyms) {
    const normalized = normalizeKey(s)
    if (colMap[normalized] !== undefined) {
      const val = row[colMap[normalized]]
      if (val !== undefined && val !== '') return val
    }
  }
  return ''
}

function parseStore(val: string): string {
  if (!val) return 'store_fofuras'
  const v = val.toLowerCase()
  if (v.includes('artes')) return 'store_artes'
  return 'store_fofuras'
}

// ── Interpreta valor de laco/aplique: numero ou 'x' ─────────────────────────
function parseQtyOrX(val: any): number | null {
  if (!val || val === '') return null
  const s = String(val).toUpperCase().trim()
  if (s === 'X') return 1
  const n = parseInt(s)
  return isNaN(n) ? null : n
}

// ── Deriva bowType e bowQty das colunas separadas da planilha ────────────────
function parseBow(row: any, colMap: Record<string, string>): { bowType: string; bowQty: number | null } {
  // Cor do laço fica em coluna separada, não influencia o tipo
  // Colunas de tipo: LAÇO SIMPLES / laço fita / laço elastico  →  SIMPLE
  //                  LAÇO LUXO / laço com pedra                →  LUXURY
  const simpleVal = getCol(row, colMap, 'LAÇO SIMPLES', 'laco simples', 'laco fita', 'laço fita', 'laço elastico', 'laco elastico')
  const luxoVal   = getCol(row, colMap, 'LAÇO LUXO', 'laco luxo', 'laço luxo', 'laço com pedra', 'laco com pedra')

  const simpleQty = parseQtyOrX(simpleVal)
  const luxoQty   = parseQtyOrX(luxoVal)

  // Verifica se é 'SEM LAÇO'
  const corLaco = String(getCol(row, colMap, 'COR LAÇO', 'cor laco', 'cor do laco', 'laço', 'laco') || '').toUpperCase().trim()
  if (corLaco === 'SEM LACO' || corLaco === 'SEM LAÇO') {
    return { bowType: 'NONE', bowQty: null }
  }

  if (luxoQty !== null) return { bowType: 'LUXURY', bowQty: luxoQty }
  if (simpleQty !== null) return { bowType: 'SIMPLE', bowQty: simpleQty }

  // Fallback: coluna única antiga (ex: 'laço' com valor numérico)
  const legacyQty = parseQtyOrX(corLaco)
  if (legacyQty !== null) return { bowType: 'SIMPLE', bowQty: legacyQty }

  return { bowType: 'NONE', bowQty: null }
}

// ── Deriva appliqueType e appliqueQty ────────────────────────────────────────
function parseApplique(row: any, colMap: Record<string, string>): { appliqueType: string; appliqueQty: number | null } {
  const luxVal    = getCol(row, colMap, 'APLIQUE 3D LUXO', 'aplique 3d lux', 'THREE_D_LUX')
  const d3Val     = getCol(row, colMap, 'APLIQUE 3D', 'aplique 3d', 'THREE_D')
  const simpVal   = getCol(row, colMap, 'APLIQUE SIMPLES', 'aplique simples', 'SIMPLE')

  const luxQty   = parseQtyOrX(luxVal)
  const d3Qty    = parseQtyOrX(d3Val)
  const simpQty  = parseQtyOrX(simpVal)

  if (luxQty !== null)  return { appliqueType: 'THREE_D_LUX', appliqueQty: luxQty }
  if (d3Qty !== null)   return { appliqueType: 'THREE_D',     appliqueQty: d3Qty }
  if (simpQty !== null) return { appliqueType: 'SIMPLE',      appliqueQty: simpQty }

  // Fallback: coluna 'Aplique' com texto (formato antigo)
  const legacyVal = String(getCol(row, colMap, 'Aplique', 'aplique') || '').toUpperCase()
  if (legacyVal.includes('3D') && legacyVal.includes('LUXO')) return { appliqueType: 'THREE_D_LUX', appliqueQty: null }
  if (legacyVal.includes('3D'))     return { appliqueType: 'THREE_D', appliqueQty: null }
  if (legacyVal.includes('SIMPLES') || legacyVal.includes('SIMPLE')) return { appliqueType: 'SIMPLE', appliqueQty: null }

  return { appliqueType: 'NONE', appliqueQty: null }
}

function parseDate(val: any): string {
  if (!val) return ''
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0]
  }
  if (typeof val === 'string') {
    const parts = val.split('/')
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
    if (val.includes('-')) return val.split('T')[0]
  }
  return ''
}

export default function ImportarPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pedidos, setPedidos] = useState<PedidoPreview[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [fileName, setFileName] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      const wb = XLSX.read(data, { type: 'binary', cellDates: true })

      // Tenta aba PEDIDOS, senão pega a primeira com dados reais (ignora abas auxiliares)
      const sheetName = wb.SheetNames.includes('PEDIDOS')
        ? 'PEDIDOS'
        : wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const parsed: PedidoPreview[] = rows
        .filter(row => {
          // Ignora linhas completamente vazias
          const vals = Object.values(row)
          return vals.some(v => v !== '' && v !== null && v !== undefined)
        })
        .map((row, i) => {
          const colMap = buildColMap(row)

          // ── Campos principais (modelo v3 + planilhas antigas) ────────────
          const recipientName = String(
            getCol(row, colMap,
              'Destinatário *', 'Destinatario *', 'Destinatário', 'Destinatario',
              'Nome do destinatário', 'Nome do destinatario')
          ).trim()

          const productName = String(
            getCol(row, colMap, 'Produto *', 'Produto', 'PRODUTO', 'Nome do Produto', 'd')
          ).trim()

          const externalId = String(
            getCol(row, colMap, 'ID Shopee', 'ID PEDIDO', 'id pedido', 'id shopee')
          ).trim()

          const buyerUsername = String(
            getCol(row, colMap, 'Id user Shopee', 'id user shopee', 'Nome de usuário (comprador)', 'nome de usuario (comprador)', 'buyerUsername')
          ).trim()

          const totalItems = (() => {
            const v = getCol(row, colMap, 'QUANTIDADE DE ITENS NO PEDIDO', 'quantidade de itens no pedido', 'Número de produtos pedidos', 'numero de produtos pedidos')
            const n = parseInt(String(v))
            return isNaN(n) ? null : n
          })()

          const theme = String(
            getCol(row, colMap, 'Tema', 'TEMA', 'TEMAS V2', 'temas v2')
          ).trim()

          const childName = String(
            getCol(row, colMap, 'Nome e Idade', 'Nome e idade', 'nome e idade')
          ).trim()

          const notes = String(
            getCol(row, colMap,
              'Observação', 'Observacao',
              'Observação do comprador', 'Observacao do comprador')
          ).trim()

          const variation = String(
            getCol(row, colMap, 'Variação', 'Variacao', 'Nome da variação', 'Nome da variacao')
          ).trim()

          const quantity = Number(getCol(row, colMap, 'Quantidade') || 1)

          const dueDateRaw = getCol(row, colMap, 'Data Envio', 'Dt envio', 'data envio', 'Data prevista de envio')
          const dueDate = parseDate(dueDateRaw)

          const storeRaw = String(getCol(row, colMap, 'Loja', 'LOJA', 'loja') || '').trim()

          // ── Cor do laço ───────────────────────────────────────────────
          const bowColorRaw = String(
            getCol(row, colMap,
              'COR DO LAÇO', 'COR DO LACO',
              'COR LAÇO', 'COR LACO', 'cor laco', 'cor do laco')
          ).trim()
          const bowColor = (bowColorRaw.toUpperCase() === 'SEM LACO' || bowColorRaw.toUpperCase() === 'SEM LACO')
            ? '' : bowColorRaw

          // ── Laço: modelo v3 usa TIPO DE LAÇO + QUANTIDADE DE LACO ─────
          const tipoLacoV3 = String(getCol(row, colMap, 'TIPO DE LAÇO', 'TIPO DE LACO', 'tipo de laco', 'tipo de laço') || '').toUpperCase().trim()
          const qtdLacoV3  = parseQtyOrX(getCol(row, colMap, 'QUANTIDADE DE LACO', 'QUANTIDADE DE LAÇO', 'quantidade de laco', 'quantidade de laço'))

          let bowType = 'NONE'
          let bowQty: number | null = null

          if (tipoLacoV3) {
            if (tipoLacoV3.includes('LUXO') || tipoLacoV3 === 'LUXURY') bowType = 'LUXURY'
            else if (tipoLacoV3.includes('SIMPLES') || tipoLacoV3 === 'SIMPLE') bowType = 'SIMPLE'
            bowQty = qtdLacoV3
          } else {
            const r = parseBow(row, colMap)
            bowType = r.bowType
            bowQty  = r.bowQty
          }

          // ── Aplique: modelo v3 usa TIPO DE APLIQUE + QUANTIDADE DE APLIQUE
          const tipoApliqueV3 = String(getCol(row, colMap, 'TIPO DE APLIQUE', 'tipo de aplique') || '').toUpperCase().trim()
          const qtdApliqueV3  = parseQtyOrX(getCol(row, colMap, 'QUANTIDADE DE APLIQUE', 'quantidade de aplique'))

          let appliqueType = 'NONE'
          let appliqueQty: number | null = null

          if (tipoApliqueV3) {
            if (tipoApliqueV3.includes('3D') && tipoApliqueV3.includes('LUXO')) appliqueType = 'THREE_D_LUX'
            else if (tipoApliqueV3 === 'THREE_D_LUX') appliqueType = 'THREE_D_LUX'
            else if (tipoApliqueV3.includes('3D') || tipoApliqueV3 === 'THREE_D') appliqueType = 'THREE_D'
            else if (tipoApliqueV3.includes('SIMPLES') || tipoApliqueV3 === 'SIMPLE') appliqueType = 'SIMPLE'
            appliqueQty = qtdApliqueV3
          } else {
            const r = parseApplique(row, colMap)
            appliqueType = r.appliqueType
            appliqueQty  = r.appliqueQty
          }

                    const valid = !!recipientName && !!productName

          return {
            externalId,
            buyerUsername,
            storeId: parseStore(storeRaw),
            recipientName,
            dueDate,
            productName,
            variation,
            quantity,
            totalItems,
            theme,
            childName,
            notes,
            bowColor,
            bowType,
            bowQty,
            appliqueType,
            appliqueQty,
            _valid: valid,
            _error: !valid
              ? `Linha ${i + 2}: ${!recipientName ? 'Destinatário obrigatório' : 'Produto obrigatório'}`
              : '',
          }
        })
        .filter(p => p.recipientName || p.productName)

      setPedidos(parsed)
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    const validos = pedidos.filter(p => p._valid)
    setImporting(true)

    try {
      const res = await fetch('/api/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidos: validos, workspaceId: 'ws_atelier' })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro desconhecido')

      if (data.created === 0) {
        alert(`Nenhum pedido criado.\n\nErros:\n${data.errors?.join('\n') || 'Sem detalhes'}`)
        return
      }

      if (data.errors?.length > 0) {
        alert(`${data.created} importados com ${data.errors.length} erros:\n${data.errors.join('\n')}`)
      }

      setDone(true)
      setTimeout(() => router.push('/pedidos'), 2000)
    } catch (err: any) {
      alert(`Erro ao importar: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const validos   = pedidos.filter(p => p._valid)
  const invalidos = pedidos.filter(p => !p._valid)

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-6xl">🎉</div>
        <p className="text-xl font-bold text-green-700">{validos.length} pedidos importados!</p>
        <p className="text-gray-500 text-sm">Redirecionando para a lista de pedidos...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Importar Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload da planilha — lê automaticamente as colunas da Shopee
          </p>
        </div>
      </div>

      {/* UPLOAD */}
      {pedidos.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-purple-200 rounded-2xl p-16 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
        >
          <div className="text-5xl mb-4">📂</div>
          <p className="font-semibold text-gray-700 text-lg">Clique para selecionar a planilha</p>
          <p className="text-gray-400 text-sm mt-2">Arquivos .xlsx</p>
          <input ref={inputRef} type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
        </div>
      )}

      {/* PRÉVIA */}
      {pedidos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
              ✅ <span className="font-semibold text-green-700">{validos.length}</span> pedidos válidos
            </div>
            {invalidos.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
                ⚠️ <span className="font-semibold text-red-600">{invalidos.length}</span> com erro
              </div>
            )}
            <span className="text-sm text-gray-400">{fileName}</span>
            <button
              onClick={() => { setPedidos([]); setFileName('') }}
              className="text-sm text-gray-400 hover:text-gray-600 ml-auto"
            >
              Limpar
            </button>
          </div>

          {invalidos.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
              {invalidos.map((p, i) => <p key={i}>⚠️ {p._error}</p>)}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">ID Shopee</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">ID User</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Loja</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Destinatário</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Data Envio</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Produto</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Variação</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Tema</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Criança</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Observação</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Cor Laço</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Tipo Laço</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">Qtd Laço</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Tipo Aplique</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">Qtd Aplique</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">Qtd Itens</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">Qtd Pedido</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${!p._valid ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2">{p._valid ? '✅' : '❌'}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs font-mono">{p.externalId || '—'}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{p.buyerUsername || '—'}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                        {p.storeId === 'store_artes' ? 'Artes e Tal' : 'Fofuras de Papel'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">{p.recipientName || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{p.dueDate || '—'}</td>
                    <td className="px-3 py-2 text-gray-700 text-xs max-w-xs truncate" title={p.productName}>{p.productName || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{p.variation || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{p.theme || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{p.childName || '—'}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs max-w-xs truncate" title={p.notes}>{p.notes || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{p.bowColor || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {p.bowType === 'LUXURY' ? 'Luxo' : p.bowType === 'SIMPLE' ? 'Simples' : '—'}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-purple-700">{p.bowQty ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {p.appliqueType === 'THREE_D_LUX' ? '3D Luxo' : p.appliqueType === 'THREE_D' ? '3D' : p.appliqueType === 'SIMPLE' ? 'Simples' : '—'}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-purple-700">{p.appliqueQty ?? '—'}</td>
                    <td className="px-3 py-2 text-center font-bold text-blue-600">{p.totalItems ?? '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-700">{p.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setPedidos([]); setFileName('') }}
              className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validos.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {importing ? 'Importando...' : `Importar ${validos.length} pedidos`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
