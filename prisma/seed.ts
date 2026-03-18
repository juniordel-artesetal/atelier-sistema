import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ─── WORKSPACE ───────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { id: 'ws_atelier' },
    update: {},
    create: {
      id: 'ws_atelier',
      name: 'Ateliê Principal',
    },
  })
  console.log('✅ Workspace criado:', workspace.name)

  // ─── LOJAS ───────────────────────────────────────────────
  const lojaFofuras = await prisma.store.upsert({
    where: { id: 'store_fofuras' },
    update: {},
    create: {
      id: 'store_fofuras',
      workspaceId: 'ws_atelier',
      name: 'Fofuras de Papel',
    },
  })

  const lojaArtes = await prisma.store.upsert({
    where: { id: 'store_artes' },
    update: {},
    create: {
      id: 'store_artes',
      workspaceId: 'ws_atelier',
      name: 'Artes e Tal',
    },
  })
  console.log('✅ Lojas criadas:', lojaFofuras.name, '|', lojaArtes.name)

  // ─── DEPARTAMENTOS ────────────────────────────────────────
  const departments = [
    { id: 'dep_arte',      name: 'Arte',      color: '#8B5CF6' },
    { id: 'dep_impressao', name: 'Impressão', color: '#3B82F6' },
    { id: 'dep_producao',  name: 'Produção',  color: '#F59E0B' },
    { id: 'dep_expedicao', name: 'Expedição', color: '#10B981' },
  ]

  for (const dep of departments) {
    await prisma.department.upsert({
      where: { id: dep.id },
      update: {},
      create: { ...dep, workspaceId: 'ws_atelier' },
    })
  }
  console.log('✅ Departamentos criados')

  // ─── WORKFLOW STEPS ───────────────────────────────────────
  const steps = [
    { id: 'step_arte',      name: 'Arte',      code: 'ARTE',      sortOrder: 1, departmentId: 'dep_arte'      },
    { id: 'step_impressao', name: 'Impressão', code: 'IMPRESSAO', sortOrder: 2, departmentId: 'dep_impressao' },
    { id: 'step_producao',  name: 'Produção',  code: 'PRODUCAO',  sortOrder: 3, departmentId: 'dep_producao'  },
    { id: 'step_expedicao', name: 'Expedição', code: 'EXPEDICAO', sortOrder: 4, departmentId: 'dep_expedicao' },
  ]

  for (const step of steps) {
    await prisma.workflowStep.upsert({
      where: { id: step.id },
      update: {},
      create: { ...step, workspaceId: 'ws_atelier' },
    })
  }
  console.log('✅ Workflow steps criados')

  // ─── PEDIDO DE TESTE ──────────────────────────────────────
  const order = await prisma.order.create({
    data: {
      workspaceId:   'ws_atelier',
      storeId:       'store_fofuras',
      externalId:    '25122211E4PXJ0',
      channel:       'shopee',
      buyerUsername: '_ix7p3p_yc',
      recipientName: 'Mariane Cardoso Cruz',
      dueDate:       new Date('2026-01-09'),
      status:        'PENDING',
      notes:         'Pedido de teste',
      items: {
        create: {
          productName: 'Cofrinho Personalizado MUNDO BITA',
          variation:   'Completo (embalagem+laço+tag),20',
          quantity:    1,
          totalItems:  1,
          theme:       'mundo bita mod 1',
          childName:   'Ruan Lucca 1 ano',
          bowColor:    'laranja',
          bowType:     'SIMPLE',
          appliqueType: 'NONE',
          productionResponsible: 'debora',
          artResponsible:        'viviane',
        }
      }
    },
    include: { items: true }
  })
  console.log('✅ Pedido de teste criado:', order.externalId)

  // ─── WORK ITEMS (tarefas do pedido de teste) ──────────────
  const item = order.items[0]

  await prisma.workItem.create({
    data: {
      workspaceId:  'ws_atelier',
      orderId:      order.id,
      orderItemId:  item.id,
      stepId:       'step_arte',
      departmentId: 'dep_arte',
      status:       'TODO',
      dueDate:      new Date('2026-01-09'),
    }
  })
  console.log('✅ WorkItem criado na fila de Arte')

  console.log('\n🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
  // ─── USUÁRIO ADMIN ───────────────────────────────────────────
const hashedPassword = await bcrypt.hash('admin123', 10)

await prisma.user.upsert({
  where: { email: 'admin@atelier.com' },
  update: {},
  create: {
    id: 'user_admin',
    workspaceId: 'ws_atelier',
    name: 'Administrador',
    email: 'admin@atelier.com',
    password: hashedPassword,
    role: 'ADMIN',
  }
})

console.log('👤 Usuário admin criado: admin@atelier.com / admin123')