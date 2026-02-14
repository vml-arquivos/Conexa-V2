import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Cocris@2026';
const UNIT_CODE = 'ARARA-CAN';
const CSV_OUTPUT = path.join(__dirname, '../../exports/urgent-logins.csv');

interface UserToCreate {
  email: string;
  firstName: string;
  lastName: string;
  scopeLevel: 'MANTENEDORA' | 'UNIDADE' | 'PROFESSOR';
  unitCode?: string; // Se null, acessa todas as unidades
  description: string;
}

const URGENT_USERS: UserToCreate[] = [
  {
    email: 'bruna.vaz@cocris.org.br',
    firstName: 'Bruna',
    lastName: 'Vaz',
    scopeLevel: 'MANTENEDORA',
    description: 'Coordenadora Geral (acesso a TODAS as unidades)',
  },
  {
    email: 'carla.psicologa@cocris.org.br',
    firstName: 'Carla',
    lastName: 'Psicóloga',
    scopeLevel: 'MANTENEDORA',
    description: 'Psicóloga (acesso a relatórios de TODAS as unidades)',
  },
  {
    email: 'ana.carolina@cocris.org.br',
    firstName: 'Ana',
    lastName: 'Carolina',
    scopeLevel: 'UNIDADE',
    unitCode: UNIT_CODE,
    description: 'Coordenação da Unidade (somente ARARA-CAN)',
  },
  {
    email: 'diretor.arara@cocris.org.br',
    firstName: 'Diretor',
    lastName: 'Arara Canindé',
    scopeLevel: 'UNIDADE',
    unitCode: UNIT_CODE,
    description: 'Diretor (ARARA-CAN)',
  },
  {
    email: 'secretaria.arara@cocris.org.br',
    firstName: 'Secretária',
    lastName: 'Arara Canindé',
    scopeLevel: 'UNIDADE',
    unitCode: UNIT_CODE,
    description: 'Secretária (ARARA-CAN)',
  },
  {
    email: 'nutricionista.arara@cocris.org.br',
    firstName: 'Nutricionista',
    lastName: 'Arara Canindé',
    scopeLevel: 'UNIDADE',
    unitCode: UNIT_CODE,
    description: 'Nutricionista (ARARA-CAN)',
  },
];

async function main() {
  console.log('🚀 Criando logins urgentes COCRIS...\n');

  // 1. Buscar Mantenedora COCRIS
  const mantenedora = await prisma.mantenedora.findUnique({
    where: { cnpj: '00.000.000/0001-00' },
  });

  if (!mantenedora) {
    throw new Error('❌ Mantenedora COCRIS não encontrada. Execute ensure-cocris-units.ts primeiro.');
  }

  console.log(`✅ Mantenedora: ${mantenedora.name} (${mantenedora.id})\n`);

  // 2. Buscar unidade ARARA-CAN (para usuários UNIDADE)
  const araraUnit = await prisma.unit.findFirst({
    where: {
      code: UNIT_CODE,
      mantenedoraId: mantenedora.id,
    },
  });

  if (!araraUnit) {
    throw new Error(`❌ Unidade ${UNIT_CODE} não encontrada.`);
  }

  console.log(`✅ Unidade: ${araraUnit.name} (${araraUnit.id})\n`);

  // 3. Hash da senha
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 4. Criar usuários
  const csvLines: string[] = ['Email,Nome,Senha,Perfil,Descrição'];
  let created = 0;
  let skipped = 0;

  for (const userData of URGENT_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`🔄 Já existe: ${userData.email}`);
      skipped++;
      csvLines.push(
        `${userData.email},"${userData.firstName} ${userData.lastName}",${DEFAULT_PASSWORD},${userData.scopeLevel},"${userData.description}"`,
      );
      continue;
    }

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        mantenedoraId: mantenedora.id,
        unitId: userData.unitCode ? araraUnit.id : null,
        status: 'ATIVO',
      },
    });

    // Criar role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: userData.scopeLevel, // Placeholder
        scopeLevel: userData.scopeLevel,
        isActive: true,
      },
    });

    console.log(`✅ Criado: ${userData.email} (${userData.scopeLevel})`);
    created++;

    csvLines.push(
      `${userData.email},"${userData.firstName} ${userData.lastName}",${DEFAULT_PASSWORD},${userData.scopeLevel},"${userData.description}"`,
    );
  }

  // 5. Exportar CSV
  const exportsDir = path.dirname(CSV_OUTPUT);
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  fs.writeFileSync(CSV_OUTPUT, csvLines.join('\n'), 'utf-8');

  console.log(`\n📊 Resumo:`);
  console.log(`   - Criados: ${created}`);
  console.log(`   - Já existentes: ${skipped}`);
  console.log(`   - Total: ${URGENT_USERS.length}`);
  console.log(`\n📄 Credenciais exportadas: ${CSV_OUTPUT}`);
  console.log(`\n⚠️  SENHA PADRÃO: ${DEFAULT_PASSWORD}`);
  console.log(`   (Alterar no primeiro login)\n`);
  console.log(`✅ Logins criados com sucesso!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
