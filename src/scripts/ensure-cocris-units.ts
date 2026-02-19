import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UnitData {
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

const COCRIS_UNITS: UnitData[] = [
  {
    code: 'ARARA-CAN',
    name: 'CEPI Arara Canindé',
    email: 'arara.caninde@cocris.org.br',
    phone: '(62) 3201-1001',
    address: 'Goiânia, GO',
  },
  {
    code: 'BEIJA-FLO',
    name: 'CEPI Beija-Flor',
    email: 'beija.flor@cocris.org.br',
    phone: '(62) 3201-1002',
    address: 'Goiânia, GO',
  },
  {
    code: 'SABIA-CAM',
    name: 'CEPI Sabiá do Campo',
    email: 'sabia.campo@cocris.org.br',
    phone: '(62) 3201-1003',
    address: 'Goiânia, GO',
  },
  {
    code: 'CORAC-CRI',
    name: 'Escola EI Coração de Cristo',
    email: 'coracao.cristo@cocris.org.br',
    phone: '(62) 3201-1004',
    address: 'Goiânia, GO',
  },
  {
    code: 'PELICANO',
    name: 'Centro Pelicano',
    email: 'pelicano@cocris.org.br',
    phone: '(62) 3201-1005',
    address: 'Goiânia, GO',
  },
  {
    code: 'FLAMBOY',
    name: 'CEPI Flamboyant',
    email: 'flamboyant@cocris.org.br',
    phone: '(62) 3201-1006',
    address: 'Goiânia, GO',
  },
];

async function main() {
  console.log('🚀 Iniciando importação de unidades COCRIS...\n');

  // 1. Buscar ou criar Mantenedora COCRIS
  let mantenedora = await prisma.mantenedora.findUnique({
    where: { cnpj: '00.000.000/0001-00' }, // CNPJ placeholder COCRIS
  });

  if (!mantenedora) {
    console.log('📌 Criando Mantenedora COCRIS...');
    mantenedora = await prisma.mantenedora.create({
      data: {
        name: 'COCRIS - Congregação Cristã no Brasil',
        cnpj: '00.000.000/0001-00',
        email: 'contato@cocris.org.br',
        phone: '(62) 3201-1000',
        address: 'Goiânia, GO',
        city: 'Goiânia',
        state: 'GO',
        zipCode: '74000-000',
      },
    });
    console.log(`✅ Mantenedora criada: ${mantenedora.name} (${mantenedora.id})\n`);
  } else {
    console.log(`✅ Mantenedora encontrada: ${mantenedora.name} (${mantenedora.id})\n`);
  }

  // 2. Upsert unidades
  let created = 0;
  let updated = 0;

  for (const unitData of COCRIS_UNITS) {
    const existing = await prisma.unit.findFirst({
      where: {
        code: unitData.code,
        mantenedoraId: mantenedora.id,
      },
    });

    if (existing) {
      await prisma.unit.update({
        where: { id: existing.id },
        data: {
          name: unitData.name,
          email: unitData.email,
          phone: unitData.phone,
          address: unitData.address,
        },
      });
      console.log(`🔄 Atualizada: ${unitData.code} - ${unitData.name}`);
      updated++;
    } else {
      await prisma.unit.create({
        data: {
          code: unitData.code,
          name: unitData.name,
          email: unitData.email,
          phone: unitData.phone,
          address: unitData.address,
          mantenedoraId: mantenedora.id,
        },
      });
      console.log(`✅ Criada: ${unitData.code} - ${unitData.name}`);
      created++;
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   - Criadas: ${created}`);
  console.log(`   - Atualizadas: ${updated}`);
  console.log(`   - Total: ${COCRIS_UNITS.length}`);
  console.log(`\n✅ Importação concluída!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
