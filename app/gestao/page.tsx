'use client'
// app/gestao/page.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Send, RefreshCw, Sparkles, ChevronLeft, ChevronRight, RotateCcw, TrendingUp, DollarSign, Target, AlertCircle } from 'lucide-react'

function fmtR(n: number) {
  return 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const PERGUNTAS_RAPIDAS = [
  { label: '📊 Diagnóstico completo', msg: 'Faça um diagnóstico completo do meu negócio este mês, incluindo lucro bruto, lucro líquido, margem e diagnóstico automático.' },
  { label: '🎯 Ponto de equilíbrio', msg: 'Qual é o meu ponto de equilíbrio? Quanto preciso vender para não ter prejuízo?' },
  { label: '📦 Análise dos produtos', msg: 'Analise meus produtos cadastrados. Quais têm melhor margem? Onde estou perdendo mais com taxas?' },
  { label: '💡 Sugestões de melhoria', msg: 'Com base nos meus dados, quais ajustes posso fazer para melhorar minha margem?' },
  { label: '📈 Tendência dos últimos meses', msg: 'Como está a evolução do meu negócio nos últimos meses? Estou crescendo ou perdendo margem?' },
  { label: '💰 Meta de pró-labore', msg: 'Quero aumentar meu pró-labore. Me ajude a calcular quanto preciso faturar para isso.' },
]

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

// Formata o texto da IA em markdown simples
function FormatarResposta({ texto }: { texto: string }) {
  const linhas = texto.split('\n')
  return (
    <div className="space-y-1.5 text-sm text-gray-700 leading-relaxed">
      {linhas.map((linha, i) => {
        if (!linha.trim()) return <div key={i} className="h-1" />
        if (linha.startsWith('# '))  return <h2 key={i} className="text-base font-bold text-gray-800 mt-3">{linha.slice(2)}</h2>
        if (linha.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-gray-800 mt-2">{linha.slice(3)}</h3>
        if (linha.startsWith('---')) return <hr key={i} className="border-gray-200 my-3" />
        if (linha.startsWith('🟢') || linha.startsWith('🟡') || linha.startsWith('🔴')) {
          const cor = linha.startsWith('🟢') ? 'bg-green-50 border-green-200 text-green-800'
                    : linha.startsWith('🟡') ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-red-50 border-red-200 text-red-800'
          return <div key={i} className={`px-3 py-2 rounded-lg border font-semibold ${cor}`}>{linha}</div>
        }
        if (linha.startsWith('✅') || linha.startsWith('✔️') || linha.startsWith('👉') || linha.startsWith('⚠️') || linha.startsWith('❌')) {
          return <p key={i} className="pl-2">{linha}</p>
        }
        if (linha.startsWith('- ') || linha.startsWith('• ')) {
          return <p key={i} className="pl-4 before:content-['·'] before:mr-2 before:text-purple-400">{linha.slice(2)}</p>
        }
        if (/^\d+\.\s/.test(linha)) {
          return <p key={i} className="pl-4">{linha}</p>
        }
        // Negrito inline **texto**
        const partes = linha.split(/(\*\*[^*]+\*\*)/)
        return (
          <p key={i}>
            {partes.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={j} className="font-semibold text-gray-800">{p.slice(2, -2)}</strong>
                : <span key={j}>{p}</span>
            )}
          </p>
        )
      })}
    </div>
  )
}

export default function GestaoPage() {
  const hoje = new Date()
  const [ano, setAno]           = useState(hoje.getFullYear())
  const [mes, setMes]           = useState(hoje.getMonth() + 1)
  const [contexto, setContexto] = useState<any>(null)
  const [loadingCtx, setLoadingCtx] = useState(true)
  const [msgs, setMsgs]         = useState<Mensagem[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [usage, setUsage]       = useState({ calls: 0, limite: 5 })
  const [erro, setErro]         = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const navMes = (dir: number) => {
    let nm = mes + dir, na = ano
    if (nm < 1)  { nm = 12; na-- }
    if (nm > 12) { nm = 1;  na++ }
    setMes(nm); setAno(na)
  }

  // Buscar contexto do banco
  const fetchContexto = useCallback(async () => {
    setLoadingCtx(true)
    setErro('')
    try {
      const res = await fetch(`/api/gestao/contexto?ano=${ano}&mes=${mes}`)
      const data = await res.json()
      setContexto(data)
    } catch { setErro('Erro ao carregar dados financeiros.') }
    finally { setLoadingCtx(false) }
  }, [ano, mes])

  // Buscar uso diário
  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/gestao/chat')
      setUsage(await res.json())
    } catch { /* ignora */ }
  }

  useEffect(() => { fetchContexto(); fetchUsage() }, [fetchContexto])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  // Resetar chat ao mudar mês
  useEffect(() => {
    setMsgs([])
    setHistorico([])
  }, [ano, mes])

  const enviar = async (texto: string) => {
    if (!texto.trim() || loading || usage.calls >= usage.limite) return
    const msgUser: Mensagem = { role: 'user', content: texto }
    setMsgs(prev => [...prev, msgUser])
    setInput('')
    setLoading(true)
    setErro('')

    try {
      const res = await fetch('/api/gestao/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contexto, mensagem: texto, historico, ano, mes }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.limitAtingido) setErro(`Limite de ${usage.limite} análises diárias atingido. Volte amanhã!`)
        else setErro(data.error || 'Erro ao gerar análise.')
        setMsgs(prev => prev.slice(0, -1))
        return
      }

      const msgAI: Mensagem = { role: 'assistant', content: data.content }
      setMsgs(prev => [...prev, msgAI])
      setHistorico(data.historico || [])
      setUsage(prev => ({ ...prev, calls: prev.calls + 1 }))
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setMsgs(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const resetar = () => { setMsgs([]); setHistorico([]); setErro('') }

  const fin = contexto?.financeiro
  const restantes = Math.max(0, usage.limite - usage.calls)

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── Cabeçalho */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Análise de Gestão</h1>
              <p className="text-xs text-gray-500">Assistente financeiro com dados reais do ateliê</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Navegação mês */}
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
              <button type="button" onClick={() => navMes(-1)} className="p-0.5 hover:bg-gray-200 rounded">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[130px] text-center">
                {MESES[mes - 1]} {ano}
              </span>
              <button type="button" onClick={() => navMes(1)} className="p-0.5 hover:bg-gray-200 rounded">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Uso diário */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              restantes === 0 ? 'bg-red-50 border-red-200 text-red-600'
              : restantes <= 2 ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              {restantes}/{usage.limite} análises hoje
            </div>

            {msgs.length > 0 && (
              <button type="button" onClick={resetar}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                <RotateCcw className="w-3.5 h-3.5" /> Novo chat
              </button>
            )}
          </div>
        </div>

        {/* Cards de contexto financeiro */}
        {!loadingCtx && fin && (
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Receita', value: fmtR(fin.totalReceita), icon: TrendingUp, cor: 'text-green-600 bg-green-50 border-green-100' },
              { label: 'Despesa', value: fmtR(fin.totalDespesa), icon: DollarSign, cor: 'text-red-600 bg-red-50 border-red-100' },
              { label: 'Resultado', value: fmtR(fin.resultado), icon: Target, cor: fin.resultado >= 0 ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-red-600 bg-red-50 border-red-100' },
              { label: 'Margem', value: `${fin.margem}%`, icon: AlertCircle, cor: fin.margem >= 15 ? 'text-green-600 bg-green-50 border-green-100' : fin.margem >= 10 ? 'text-yellow-600 bg-yellow-50 border-yellow-100' : 'text-red-600 bg-red-50 border-red-100' },
            ].map(c => (
              <div key={c.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${c.cor}`}>
                <c.icon className={`w-4 h-4 flex-shrink-0 ${c.cor.split(' ')[0]}`} />
                <div>
                  <p className="text-xs opacity-70">{c.label}</p>
                  <p className="text-sm font-bold">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {loadingCtx && (
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando dados financeiros...
          </div>
        )}
      </div>

      {/* ── Área do chat */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {msgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Olá! Sou sua analista financeira 💛</h2>
              <p className="text-sm text-gray-500 max-w-md">
                Tenho acesso aos seus dados reais de {MESES[mes-1]} {ano}. 
                Escolha uma análise rápida ou me faça qualquer pergunta sobre seu negócio.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
              {PERGUNTAS_RAPIDAS.map(q => (
                <button key={q.label} type="button" onClick={() => enviar(q.msg)}
                  disabled={restantes === 0 || loadingCtx}
                  className="text-left px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all text-sm text-gray-700 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  {q.label}
                </button>
              ))}
            </div>
            {restantes === 0 && (
              <p className="text-sm text-red-500 font-medium">Limite diário atingido. Volte amanhã!</p>
            )}
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-2xl rounded-2xl px-4 py-3 ${
              m.role === 'user'
                ? 'bg-purple-600 text-white text-sm rounded-tr-sm'
                : 'bg-white border border-gray-100 shadow-sm rounded-tl-sm'
            }`}>
              {m.role === 'user'
                ? <p className="text-sm">{m.content}</p>
                : <FormatarResposta texto={m.content} />
              }
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                Analisando seus dados...
              </div>
            </div>
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {erro}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input */}
      <div className="bg-white border-t border-gray-100 px-6 py-4 flex-shrink-0">
        {msgs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {PERGUNTAS_RAPIDAS.slice(0, 3).map(q => (
              <button key={q.label} type="button" onClick={() => enviar(q.msg)}
                disabled={loading || restantes === 0}
                className="text-xs px-3 py-1.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-full text-gray-600 hover:text-purple-700 transition-colors disabled:opacity-40">
                {q.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar(input)}
            placeholder={restantes === 0 ? 'Limite diário atingido...' : 'Pergunte sobre seu negócio...'}
            disabled={loading || restantes === 0 || loadingCtx}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button type="button" onClick={() => enviar(input)}
            disabled={!input.trim() || loading || restantes === 0 || loadingCtx}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Dados de {MESES[mes-1]} {ano} · {restantes} análise{restantes !== 1 ? 's' : ''} restante{restantes !== 1 ? 's' : ''} hoje · Powered by Claude Haiku
        </p>
      </div>
    </div>
  )
}
