'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Home, LayoutDashboard, Package, Palette, Archive, Printer,
  Factory, Scissors, CheckSquare, Send, Users, UserCheck,
  Paintbrush, BarChart2, LogOut, Menu, X, ShoppingBag, ClipboardList,
  Settings, Box, DollarSign,
  TrendingUp, Wallet, Target, Tag, Brain,
} from 'lucide-react'

// ── Produção ─────────────────────────────────────────────────────────────────
const producaoTopLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pedidos',   label: 'Pedidos',   icon: Package          },
]
const lacosLinks = [
  { href: '/lacos/estoque',       label: 'Estoque',             icon: null     },
  { href: '/lacos/lancar',        label: 'Lancar Producao',     icon: null     },
  { href: '/lacos/produtividade', label: 'Produtividade Lacos', icon: BarChart2 },
]
const setores = [
  { href: '/setores/dep_arte',      label: 'Arte',                 icon: Palette,       depId: 'dep_arte'      },
  { href: '/setores/dep_arquivo',   label: 'Arquivo de Impressão', icon: Archive,       depId: 'dep_arquivo'   },
  { href: '/setores/dep_impressao', label: 'Impressão',            icon: Printer,       depId: 'dep_impressao' },
  { href: '/setores/dep_separacao', label: 'Separação de Demanda', icon: ClipboardList, depId: 'dep_separacao' },
  { href: '/setores/dep_prod_ext',  label: 'Produção Externa',     icon: Factory,       depId: 'dep_prod_ext'  },
  { href: '/setores/dep_prod_int',  label: 'Produção Interna',     icon: Scissors,      depId: 'dep_prod_int'  },
  { href: '/setores/dep_pronta',    label: 'Pronta Entrega',       icon: CheckSquare,   depId: 'dep_pronta'    },
  { href: '/setores/dep_expedicao', label: 'Expedição',            icon: Send,          depId: 'dep_expedicao' },
]

// ── Precificação ──────────────────────────────────────────────────────────────
const precLinks = [
  { href: '/precificacao/materiais',      label: 'Materiais',        icon: Box        },
  { href: '/precificacao/embalagens',     label: 'Embalagens',       icon: Package    },
  { href: '/precificacao/produtos',       label: 'Produtos',         icon: Package    },
  { href: '/precificacao/combos',         label: 'Combos',           icon: ShoppingBag },
  { href: '/precificacao/skus',           label: 'Lista de SKUs',    icon: BarChart2  },
  { href: '/precificacao/canais',         label: 'Canais de Venda',  icon: DollarSign },
  { href: '/precificacao/config-tributos',label: 'Tributação',       icon: Settings   },
  { href: '/precificacao/oraculo',        label: 'Oráculo Contábil', icon: BarChart2  },
]

// ── Financeiro ────────────────────────────────────────────────────────────────
const financeiroLinks = [
  { href: '/financeiro',             label: 'Dashboard',      icon: BarChart2  },
  { href: '/financeiro/lancamentos', label: 'Lançamentos',    icon: Wallet     },
  { href: '/financeiro/fluxo',       label: 'Fluxo de Caixa', icon: TrendingUp },
  { href: '/financeiro/metas',       label: 'Metas',          icon: Target     },
  { href: '/financeiro/categorias',  label: 'Categorias',     icon: Tag        },
]

// ── Gestão
const gestaoLinks = [
  { href: '/gestao', label: 'Análise de Gestão', icon: Brain },
]

// ── Configurações ─────────────────────────────────────────────────────────────
const configLinks = [
  { href: '/admin/usuarios',              label: 'Usuários',       icon: Users         },
  { href: '/admin/responsaveis-producao', label: 'Resp. Producao', icon: UserCheck     },
  { href: '/admin/temas',                 label: 'Temas e Cores',  icon: Paintbrush    },
  { href: '/admin/produtividade',         label: 'Produtividade',  icon: BarChart2     },
  { href: '/admin/demandas',              label: 'Demandas',       icon: ClipboardList },
]

// Determina o módulo ativo pela rota
type Modulo = 'producao' | 'precificacao' | 'financeiro' | 'gestao' | 'config'
function getModulo(pathname: string): Modulo {
  if (pathname.startsWith('/precificacao')) return 'precificacao'
  if (pathname.startsWith('/financeiro'))   return 'financeiro'
  if (pathname.startsWith('/gestao'))       return 'gestao'
  if (pathname.startsWith('/admin'))        return 'config'
  return 'producao'
}

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mounted, setMounted]       = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => { if (pathname.startsWith('/admin')) setConfigOpen(true) }, [pathname])

  if (pathname === '/login' || pathname === '/modulos') return null

  const role    = mounted ? session?.user?.role : null
  const isAdmin = role === 'ADMIN'
  const isOp    = role === 'OPERADOR'
  const canPrec = role === 'ADMIN'
  const canFin     = role === 'ADMIN'
  const canGestao  = role === 'ADMIN'
  const modulo  = getModulo(pathname)

  const userDeptIds: string[] = mounted
    ? (session?.user?.departments ?? []).map((d: any) =>
        typeof d === 'string' ? d : d.departmentId)
    : []
  const setoresVisiveis = isOp ? setores.filter(s => userDeptIds.includes(s.depId)) : setores

  const lc = (href: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname === href || pathname.startsWith(href + '/')
        ? 'bg-purple-50 text-purple-700'
        : 'text-gray-600 hover:bg-gray-50'
    }`

  function SidebarContent() {
    return (
      <>
        {/* Logo + fechar mobile */}
        <div className="mb-6 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-bold text-gray-800 text-lg">Atelie</p>
            <p className="text-xs text-gray-400">Sistema de Producao</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Início sempre visível */}
        <nav className="flex flex-col gap-1 flex-shrink-0">
          <Link href="/modulos" className={lc('/modulos')}>
            <Home size={16} />Início
          </Link>
        </nav>

        {/* ── MÓDULO: PRODUÇÃO ── */}
        {modulo === 'producao' && (
          <>
            <nav className="flex flex-col gap-1 mt-2">
              <Link href="/dashboard" className={lc('/dashboard')}><LayoutDashboard size={16} />Dashboard</Link>
              {!isOp && <Link href="/pedidos" className={lc('/pedidos')}><Package size={16} />Pedidos</Link>}
              {isOp  && <Link href="/meus-pedidos" className={lc('/meus-pedidos')}><ShoppingBag size={16} />Meus Pedidos</Link>}
            </nav>

            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-1">Laços</p>
              <nav className="flex flex-col gap-1">
                <Link href="/lacos/estoque" className={lc('/lacos/estoque')}>
                  <span className="text-sm">🎀</span> Estoque
                </Link>
                <Link href="/lacos/lancar" className={lc('/lacos/lancar')}>
                  <span className="text-sm">＋</span> Lancar Producao
                </Link>
                <Link href="/lacos/produtividade" className={lc('/lacos/produtividade')}>
                  <BarChart2 size={14} /> Produtividade Laços
                </Link>
              </nav>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-1">Setores</p>
              <nav className="flex flex-col gap-1">
                {setoresVisiveis.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className={lc(href)}><Icon size={16} />{label}</Link>
                ))}
                {isOp && setoresVisiveis.length === 0 && (
                  <p className="text-xs text-gray-400 px-3 py-2">Nenhum setor atribuido</p>
                )}
              </nav>
            </div>
          </>
        )}

        {/* ── MÓDULO: PRECIFICAÇÃO ── */}
        {modulo === 'precificacao' && canPrec && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-purple-400 uppercase px-3 mb-1">Precificação</p>
            <nav className="flex flex-col gap-1">
              {precLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={lc(href)}><Icon size={16} />{label}</Link>
              ))}
            </nav>
          </div>
        )}

        {/* ── MÓDULO: FINANCEIRO ── */}
        {modulo === 'financeiro' && canFin && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-green-600 uppercase px-3 mb-1">Financeiro</p>
            <nav className="flex flex-col gap-1">
              {financeiroLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={lc(href)}><Icon size={16} />{label}</Link>
              ))}
            </nav>
          </div>
        )}

        {/* ── MÓDULO: GESTÃO ── */}
        {modulo === 'gestao' && canGestao && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-purple-600 uppercase px-3 mb-1">Análise de Gestão</p>
            <nav className="flex flex-col gap-1">
              {gestaoLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={lc(href)}><Icon size={16} />{label}</Link>
              ))}
            </nav>
          </div>
        )}

        {/* ── MÓDULO: CONFIGURAÇÕES ── */}
        {modulo === 'config' && isAdmin && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-1">Configurações</p>
            <nav className="flex flex-col gap-1">
              {configLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={lc(href)}><Icon size={16} />{label}</Link>
              ))}
            </nav>
          </div>
        )}

        <div className="flex-1 min-h-4" />

        {/* Atalhos para outros módulos — oculto no financeiro */}
        {modulo !== 'financeiro' && modulo !== 'gestao' && (
          <div className="border-t border-gray-100 pt-3 mt-3 flex-shrink-0">
            {isAdmin && modulo !== 'config' && (
              <Link href="/admin/usuarios" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors mb-1">
                <Settings size={15} />Configurações
              </Link>
            )}
            {canGestao && (
              <Link href="/gestao" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors mb-1">
                <Brain size={15} />Análise de Gestão
              </Link>
            )}
            {canFin && (
              <Link href="/financeiro" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors mb-1">
                <TrendingUp size={15} />Financeiro
              </Link>
            )}
            {canPrec && modulo !== 'precificacao' && (
              <Link href="/precificacao/materiais" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors mb-1">
                <DollarSign size={15} />Precificação
              </Link>
            )}
            {modulo !== 'producao' && (
              <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors mb-1">
                <Factory size={15} />Produção
              </Link>
            )}
          </div>
        )}

        {/* User + Logout */}
        <div className="pt-3 border-t border-gray-100 flex-shrink-0">
          {mounted && session?.user && (
            <div className="mb-3 px-3">
              <p className="text-xs font-semibold text-gray-700 truncate">{session.user.name}</p>
              <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium mt-1 inline-block">
                {session.user.role}
              </span>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />Sair
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <aside className="hidden md:flex w-56 min-h-screen bg-white border-r border-gray-100 flex-col py-6 px-4 flex-shrink-0 overflow-y-auto">
        <SidebarContent />
      </aside>
      <div className="md:hidden">
        <button onClick={() => setMobileOpen(true)} className="fixed top-3 left-4 z-40 p-2 rounded-lg bg-white border border-gray-200 shadow-sm">
          <Menu size={20} className="text-gray-600" />
        </button>
        {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}
        <aside className={`fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col py-6 px-4 shadow-2xl transform transition-transform duration-300 overflow-y-auto ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent />
        </aside>
      </div>
    </>
  )
}
