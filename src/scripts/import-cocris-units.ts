/**
 * import-cocris-units.ts
 * Script para importar as 6 unidades COCRIS (idempotente)
 * 
 * Uso:
 *   Dev: ts-node src/scripts/import-cocris-units.ts
 *   Prod: node dist/scripts/import-cocris-units.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dados das 6 unidades COCRIS (extraídos do PDF)
const COCRIS_UNITS = [
  {
    code: 'ARARA-CAN',
    name: 'CEPI Arara Canindé',
    address: 'Qd 307 Cj 11 nº 1 – Recanto das Emas',
    city: 'Brasília',
    state: 'DF',
    zipCode: '72621412',
    phone: '(61) 3575-4363',
    email: 'aracaninde@gmail.com',
    capacity: 150,
    ageGroupsServed: '0-4',
  },
  {
    code: 'BEIJA-FLO',
    name: 'CEPI Beija-Flor',
    address: 'Qd 107 Cj 8-A – Recanto das Emas',
    city: 'Brasília',
    state: 'DF',
    zipCode: '72601310',
    phone: '(61) 3081-7602',
    email: 'beijaflorcreremas@gmail.com',
    capacity: 150,
    ageGroupsServed: '0-4',
  },
  {
    code: 'SABIA-CAM',
    name: 'CEPI Sabiá do Campo',
    address: 'Qd 305 Cj 2-A Lote 1 – Recanto das Emas',
    city: 'Brasília',
    state: 'DF',
    zipCode: '72621200',
    phone: '(61) 3578-5160',
    email: 'cepisabiadocampo@hotmail.com',
    capacity: 150,
    ageGroupsServed: '0-4',
  },
  {
    code: 'CORAC-CRI',
    name: 'Escola de Educação Infantil Coração de Cristo',
    address: 'Qd 301 Avenida Recanto das Emas, Lote 26',
    city: 'Brasília',
    state: 'DF',
    zipCode: '72620214',
    phone: '(61) 3575-4119',
    email: 'crechemovimento@gmail.com',
    capacity: 150,
    ageGroupsServed: '0-4',
  },
  {
    code: 'PELICANO',
    name: 'Pelicano – Centro de Convivência e Educação Infantil',
    address: 'Cond. Residencial São Francisco – Recanto das Emas',
    city: 'Brasília',
    state: 'DF',
    zipCode: '72620200',
    phone: '(61) 3575-4125',
    email: 'crechepelicano@gmail.com',
    capacity: 150,
    ageGroupsServed: '0-4',
  },
  {
    code: 'FLAMBOY',
    name: 'CEPI Flamboyant',
    address: 'Área Especial 1 Setor Sul – Brazlândia',
    city: 'Brasília',
    state: 'DF',
    zipCode: '72715610',
    phone: '(61) 3081-5118',
    email: 'flamboyantbraz@gmail.com',
    capacity: 150,
    ageGroupsServed: '0-4',
  },
];

async function main() {
  console.log('🚀 Iniciando importação das unidades COCRIS...\n');

  // 1. Buscar ou criar mantenedora COCRIS
  let mantenedora = await prisma.mantenedora.findFirst({
    where: { cnpj: '00.000.000/0001-00' }, // CNPJ placeholder
  });

  if (!mantenedora) {
    console.log('📝 Criando mantenedora COCRIS...');
    mantenedora = await prisma.mantenedora.create({
      data: {
        name: 'Associação Beneficente Coração de Cristo',
        cnpj: '00.000.000/0001-00', // Placeholder - atualizar com CNPJ real
        email: 'contato@cocris.org.br',
        phone: '(61) 3575-4363',
        city: 'Brasília',
        state: 'DF',
        isActive: true,
        plan: 'professional',
        maxUnits: 10,
        maxUsers: 200,
      },
    });
    console.log(`✅ Mantenedora criada: ${mantenedora.name} (ID: ${mantenedora.id})\n`);
  } else {
    console.log(`✅ Mantenedora encontrada: ${mantenedora.name} (ID: ${mantenedora.id})\n`);
  }

  // 2. Importar unidades (upsert por code)
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const unitData of COCRIS_UNITS) {
    try {
      const existing = await prisma.unit.findFirst({
        where: {
          mantenedoraId: mantenedora.id,
          code: unitData.code,
        },
      });

      if (existing) {
        // Atualizar apenas se houver mudanças
        const needsUpdate =
          existing.name !== unitData.name ||
          existing.address !== unitData.address ||
          existing.phone !== unitData.phone ||
          existing.email !== unitData.email;

        if (needsUpdate) {
          await prisma.unit.update({
            where: { id: existing.id },
            data: {
              name: unitData.name,
              address: unitData.address,
              city: unitData.city,
              state: unitData.state,
              zipCode: unitData.zipCode,
              phone: unitData.phone,
              email: unitData.email,
              capacity: unitData.capacity,
              ageGroupsServed: unitData.ageGroupsServed,
              updatedBy: 'import-script',
            },
          });
          console.log(`🔄 Atualizada: ${unitData.code} - ${unitData.name}`);
          updated++;
        } else {
          console.log(`⏭️  Ignorada (sem mudanças): ${unitData.code} - ${unitData.name}`);
          skipped++;
        }
      } else {
        // Criar nova unidade
        await prisma.unit.create({
          data: {
            mantenedoraId: mantenedora.id,
            code: unitData.code,
            name: unitData.name,
            address: unitData.address,
            city: unitData.city,
            state: unitData.state,
            zipCode: unitData.zipCode,
            phone: unitData.phone,
            email: unitData.email,
            capacity: unitData.capacity,
            ageGroupsServed: unitData.ageGroupsServed,
            isActive: true,
            createdBy: 'import-script',
          },
        });
        console.log(`✅ Criada: ${unitData.code} - ${unitData.name}`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Erro ao processar ${unitData.code}:`, error.message);
    }
  }

  console.log('\n📊 Resumo da importação:');
  console.log(`   ✅ Criadas: ${created}`);
  console.log(`   🔄 Atualizadas: ${updated}`);
  console.log(`   ⏭️  Ignoradas: ${skipped}`);
  console.log(`   📦 Total: ${COCRIS_UNITS.length}`);

  console.log('\n✅ Importação concluída!');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
