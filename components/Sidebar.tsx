'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

const links = [
  { href: '/modulos',   label: 'Início',    icon: '🏠' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
]

const setores = [
  { href: '/setores/dep_arte',      label: 'Arte',                 icon: '🎨',  depId: 'dep_arte'      },
  { href: '/setores/dep_arquivo',   label: 'Arquivo de Impressão', icon: '🗂️', depId: 'dep_arquivo'   },
  { href: '/setores/dep_impressao', label: 'Impressão',            icon: '🖨️', depId: 'dep_impressao' },
  { href: '/setores/dep_prod_ext',  label: 'Produção Externa',     icon: '🏭',  depId: 'dep_prod_ext'  },
  { href: '/setores/dep_prod_int',  label: 'Produção Interna',     icon: '🪡',  depId: 'dep_prod_int'  },
  { href: '/setores/dep_pronta',    label: 'Pronta Entrega',       icon: '✅',  depId: 'dep_pronta'    },
  { href: '/setores/dep_expedicao', label: 'Expedição',            icon: '📬',  depId: 'dep_expedicao' },
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
        typeof d === 'string' ? d : d.departmentId
      )
    : []

  const setoresVisiveis = isOp
    ? setores.filter(s => userDeptIds.includes(s.depId))
    : setores

  const lc = (href: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname === href ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
    }`

  const adminLinks = [
    { href: '/admin/usuarios',              label: 'Usuários',       icon: '👥' },
    { href: '/admin/responsaveis-producao', label: 'Resp. Produção', icon: '👷' },
    { href: '/admin/temas',                 label: 'Temas e Cores',  icon: '🖌️' },
    { href: '/admin/produtividade',         label: 'Produtividade',  icon: '📈' },
  ]

  function SidebarContent() {
    return (
      <>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-800 text-lg">Ateliê</p>
            <p className="text-xs text-gray-400">Sistema de Produção</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map(link => (
            <Link key={link.href} href={link.href} className={lc(link.href)}>
              <span>{link.icon}</span>{link.label}
            </Link>
          ))}
          {/* Pedidos: ADMIN/DELEGADOR veem lista geral; OPERADOR vê Meus Pedidos */}
          {!isOp && (
            <Link href="/pedidos" className={lc('/pedidos')}>
              <span>📦</span>Pedidos
            </Link>
          )}
          {isOp && (
            <Link href="/meus-pedidos" className={lc('/meus-pedidos')}>
              <span>📋</span>Meus Pedidos
            </Link>
          )}
        </nav>

        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2">Setores</p>
          <nav className="flex flex-col gap-1">
            {setoresVisiveis.map(link => (
              <Link key={link.href} href={link.href} className={lc(link.href)}>
                <span>{link.icon}</span>{link.label}
              </Link>
            ))}
            {isOp && setoresVisiveis.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-2">Nenhum setor atribuído</p>
            )}
          </nav>
        </div>

        {isAdmin && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2">Admin</p>
            <nav className="flex flex-col gap-1">
              {adminLinks.map(link => (
                <Link key={link.href} href={link.href} className={lc(link.href)}>
                  <span>{link.icon}</span>{link.label}
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
            <span>🚪</span>Sair
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

      {/* MOBILE: hamburguer */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-4 z-40 p-2 rounded-lg bg-white border border-gray-200 shadow-sm"
          aria-label="Abrir menu"
        >
          <div className="w-5 h-0.5 bg-gray-600 mb-1.5" />
          <div className="w-5 h-0.5 bg-gray-600 mb-1.5" />
          <div className="w-5 h-0.5 bg-gray-600" />
        </button>

        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
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
