import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

const modulos = [
  {
    icon: '🏭',
    title: 'Produção',
    description: 'Gerencie pedidos, filas de setores, fluxo de produção e expedição.',
    href: '/dashboard',
    status: 'ativo',
  },
  {
    icon: '💵',
    title: 'Gestão Financeira',
    description: 'Controle receitas, despesas, fluxo de caixa e resultados do negócio.',
    href: null,
    status: 'breve',
  },
  {
    icon: '💰',
    title: 'Precificação',
    description: 'Calcule custos de produção, defina margens e precifique seus produtos.',
    href: null,
    status: 'breve',
  },
  {
    icon: '📊',
    title: 'Vendas',
    description: 'Acompanhe o volume de vendas, canais e desempenho por loja.',
    href: null,
    status: 'breve',
  },
  {
    icon: '🧾',
    title: 'Impostos',
    description: 'Controle obrigações fiscais, notas fiscais e relatórios tributários.',
    href: null,
    status: 'breve',
  },
  {
    icon: '🤝',
    title: 'Fornecedores',
    description: 'Gerencie fornecedores, cotações, pedidos de compra e estoque.',
    href: null,
    status: 'breve',
  },
  {
    icon: '📈',
    title: 'Análise de Gestão',
    description: 'Dashboards executivos com indicadores de desempenho do negócio.',
    href: null,
    status: 'breve',
  },
  {
    icon: '📋',
    title: 'Relatórios',
    description: 'Exporte relatórios completos de produção, vendas e financeiro.',
    href: null,
    status: 'breve',
  },
]

export default async function ModulosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10 text-center">
        <p className="text-4xl mb-3">🧵</p>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Bem-vinda, {session.user.name}!
        </h1>
        <p className="text-gray-500">
          Escolha o módulo que deseja acessar ou explore o que está por vir.
        </p>
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modulos.map(mod => (
          <div key={mod.title}>
            {mod.href ? (
              <Link href={mod.href}>
                <div className="bg-white rounded-2xl border border-purple-200 p-6 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group h-full">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{mod.icon}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                      Ativo
                    </span>
                  </div>
                  <h2 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-purple-700 transition-colors">
                    {mod.title}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {mod.description}
                  </p>
                  <p className="text-xs text-purple-600 font-medium mt-4 group-hover:underline">
                    Acessar →
                  </p>
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 opacity-70 h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl grayscale">{mod.icon}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-semibold">
                    Em breve
                  </span>
                </div>
                <h2 className="font-bold text-gray-700 text-lg mb-1">
                  {mod.title}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {mod.description}
                </p>
                <p className="text-xs text-gray-300 font-medium mt-4">
                  Disponível em breve
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div className="mt-10 text-center">
        <p className="text-xs text-gray-400">
          Ateliê Sistema · Versão 1.0 · Desenvolvido sob medida para o seu negócio
        </p>
      </div>
    </div>
  )
}
