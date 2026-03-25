import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

const tabs = [
  { href: '/precificacao/materiais', label: 'Materiais'    },
  { href: '/precificacao/produtos',  label: 'Produtos'     },
  { href: '/precificacao/combos',    label: 'Combos'         },
  { href: '/precificacao/skus',      label: 'Lista de SKUs' },
  { href: '/precificacao/canais',    label: 'Canais de Venda' },
  { href: '/precificacao/calcular',          label: 'Calculadora'       },
  { href: '/precificacao/config-tributos', label: '⚙ Tributação'      },
  { href: '/precificacao/oraculo',         label: '⚖️ Oráculo Contábil' },
]

export default async function PrecificacaoLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/modulos')

  return (
    <div>
      <div className="mb-6">
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-purple-700 border-b-2 border-transparent hover:border-purple-400 transition-colors data-[active=true]:text-purple-700 data-[active=true]:border-purple-600"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}
