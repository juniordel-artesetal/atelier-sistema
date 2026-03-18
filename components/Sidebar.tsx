'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Home, LayoutDashboard, Package, Palette, Archive, Printer,
  Factory, Scissors, CheckSquare, Send, Users, UserCheck,
  Paintbrush, BarChart2, LogOut, Menu, X, ShoppingBag
} from 'lucide-react'

const links = [
  { href: '/modulos',   label: 'Início',    icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

const setores = [
  { href: '/setores/dep_arte',      label: 'Arte',                 icon: Palette,    depId: 'dep_arte'      },
  { href: '/setores/dep_arquivo',   label: 'Arquivo de Impressão', icon: Archive,    depId: 'dep_arquivo'   },
  { href: '/setores/dep_impressao', label: 'Impressão',            icon: Printer,    depId: 'dep_impressao' },
  { href: '/setores/dep_prod_ext',  label: 'Produção Externa',     icon: Factory,    depId: 'dep_prod_ext'  },
  { href: '/setores/dep_prod_int',  label: 'Produção Interna',     icon: Scissors,   depId: 'dep_prod_int'  },
  { href: '/setores/dep_pronta',    label: 'Pronta Entrega',       icon: CheckSquare,depId: 'dep_pronta'    },
  { href: '/setores/dep_expedicao', label: 'Expedição',            icon: Send,       depId: 'dep_expedicao' },
]

const adminLinks = [
  { href: '/admin/usuarios',              label: 'Usuários',       icon: Users      },
  { href: '/admin/responsaveis-producao', label: 'Resp. Producao', icon: UserCheck  },
  { href: '/admin/temas',                 label: 'Temas e Cores',  icon: Paintbrush },
  { href: '/admin/produtividade',         label: 'Produtividade',  icon: BarChart2  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mounted, setMounted]       = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (pathname === '/login') return null

  const role    = mounted ? session?.user?.role : null
  const isAdmin = role === 'ADMIN'
  const isOp    = role === 'OPERADOR'

  const userDeptIds: string[] = mounted
    ? (session?.user?.departments ?? []).map((d: any) =>
        typeof d === 'string' ? d : d.departmentId)
    : []

  const setoresVisiveis = isOp
    ? setores.filter(s => userDeptIds.includes(s.depId))
    : setores

  const lc = (href: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname === href ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
    }`

  function SidebarContent() {
    return (
      <>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-800 text-lg">Atelie</p>
            <p className="text-xs text-gray-400">Sistema de Producao</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={lc(href)}>
              <Icon size={16} />{label}
            </Link>
          ))}
          {!isOp && (
            <Link href="/pedidos" className={lc('/pedidos')}>
              <Package size={16} />Pedidos
            </Link>
          )}
          {isOp && (
            <Link href="/meus-pedidos" className={lc('/meus-pedidos')}>
              <ShoppingBag size={16} />Meus Pedidos
            </Link>
          )}
        </nav>

        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2">Lacos</p>
          <nav className="flex flex-col gap-1">
            <Link href="/lacos/estoque" className={lc('/lacos/estoque')}>
              <span style={{fontSize:14}}>&#127380;</span> Estoque
            </Link>
            <Link href="/lacos/lancar" className={lc('/lacos/lancar')}>
              <span style={{fontSize:14}}>&#43;</span> Lancar Producao
            </Link>
          </nav>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2">Setores</p>
          <nav className="flex flex-col gap-1">
            {setoresVisiveis.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={lc(href)}>
                <Icon size={16} />{label}
              </Link>
            ))}
            {isOp && setoresVisiveis.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-2">Nenhum setor atribuido</p>
            )}
          </nav>
        </div>

        {isAdmin && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2">Admin</p>
            <nav className="flex flex-col gap-1">
              {adminLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={lc(href)}>
                  <Icon size={16} />{label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100">
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
      {/* DESKTOP */}
      <aside className="hidden md:flex w-56 min-h-screen bg-white border-r border-gray-100 flex-col py-6 px-4 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* MOBILE */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-4 z-40 p-2 rounded-lg bg-white border border-gray-200 shadow-sm"
          aria-label="Abrir menu"
        >
          <Menu size={20} className="text-gray-600" />
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
        )}

        <aside className={`fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col py-6 px-4 shadow-2xl transform transition-transform duration-300 overflow-y-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <SidebarContent />
        </aside>
      </div>
    </>
  )
}
