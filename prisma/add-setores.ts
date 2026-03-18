import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Novos departamentos
  await prisma.department.createMany({
    data: [
      { id: 'dep_arquivo',  workspaceId: 'ws_atelier', name: 'Arquivo de Impressão' },
      { id: 'dep_prod_ext', workspaceId: 'ws_atelier', name: 'Produção Externa' },
      { id: 'dep_prod_int', workspaceId: 'ws_atelier', name: 'Produção Interna' },
      { id: 'dep_pronta',   workspaceId: 'ws_atelier', name: 'Pronta Entrega' },
    ],
    skipDuplicates: true,
  })

  // Atualiza sortOrder dos steps existentes
  await prisma.workflowStep.update({ where: { id: 'step_arte' },      data: { sortOrder: 1 } })
  await prisma.workflowStep.update({ where: { id: 'step_impressao' }, data: { sortOrder: 3 } })
  await prisma.workflowStep.update({ where: { id: 'step_producao' },  data: { sortOrder: 99 } })
  await prisma.workflowStep.update({ where: { id: 'step_expedicao' }, data: { sortOrder: 5 } })

  // Arquivo de Impressão
  await prisma.workflowStep.upsert({
    where:  { id: 'step_arquivo' },
    update: {},
    create: {
      id: 'step_arquivo', code: 'arquivo',
      workspaceId: 'ws_atelier', departmentId: 'dep_arquivo',
      name: 'Arquivo de Impressão', sortOrder: 2,
    }
  })

  // Produção Externa
  await prisma.workflowStep.upsert({
    where:  { id: 'step_prod_ext' },
    update: {},
    create: {
      id: 'step_prod_ext', code: 'prod_ext',
      workspaceId: 'ws_atelier', departmentId: 'dep_prod_ext',
      name: 'Produção Externa', sortOrder: 4,
    }
  })

  // Produção Interna
  await prisma.workflowStep.upsert({
    where:  { id: 'step_prod_int' },
    update: {},
    create: {
      id: 'step_prod_int', code: 'prod_int',
      workspaceId: 'ws_atelier', departmentId: 'dep_prod_int',
      name: 'Produção Interna', sortOrder: 4,
    }
  })

  // Pronta Entrega
  await prisma.workflowStep.upsert({
    where:  { id: 'step_pronta' },
    update: {},
    create: {
      id: 'step_pronta', code: 'pronta',
      workspaceId: 'ws_atelier', departmentId: 'dep_pronta',
      name: 'Pronta Entrega', sortOrder: 4,
    }
  })

  console.log('Setores criados com sucesso!')
  await prisma.$disconnect()
}

main()