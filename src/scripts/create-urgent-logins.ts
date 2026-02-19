import { PrismaClient, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { ensureRoles } from './_ensure-roles';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Cocris@2026';
const UNIT_CODE = 'ARARA-CAN';
const CSV_OUTPUT = path.join(__dirname, '../../exports/urgent-logins.csv');

interface UserToCreate {
  email: string;
  firstName: string;
  lastName: string;
  roleType: RoleType;
  unitCode?: string; // Se null, acessa todas as unidades via UnitScope
  description: string;
}

const URGENT_USERS: UserToCreate[] = [
  {
    email: 'bruna.vaz@cocris.org',
    firstName: 'Bruna',
    lastName: 'Vaz',
    roleType: 'STAFF_CENTRAL_PEDAGOGICO',
    description: 'Coordenadora Geral (acesso a TODAS as unidades)',
  },
  {
    email: 'carla.psicologa@cocris.org',
    firstName: 'Carla',
    lastName: 'Psicóloga',
    roleType: 'STAFF_CENTRAL_PSICOLOGIA',
    description: 'Psicóloga (acesso a relatórios de TODAS as unidades)',
  },
  {
    email: 'ana.carolina@cocris.org',
    firstName: 'Ana',
    lastName: 'Carolina',
    roleType: 'UNIDADE_COORDENADOR_PEDAGOGICO',
    unitCode: UNIT_CODE,
    description: 'Coordenação da Unidade (somente ARARA-CAN)',
  },
  {
    email: 'diretor.arara@cocris.org',
    firstName: 'Diretor',
    lastName: 'Arara Canindé',
    roleType: 'UNIDADE_DIRETOR',
    unitCode: UNIT_CODE,
    description: 'Diretor (ARARA-CAN)',
  },
  {
    email: 'secretaria.arara@cocris.org',
    firstName: 'Secretária',
    lastName: 'Arara Canindé',
    roleType: 'UNIDADE_ADMINISTRATIVO',
    unitCode: UNIT_CODE,
    description: 'Secretária (ARARA-CAN)',
  },
  {
    email: 'nutricionista.arara@cocris.org',
    firstName: 'Nutricionista',
    lastName: 'Arara Canindé',
    roleType: 'UNIDADE_NUTRICIONISTA',
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

  // 2. Garantir que todos os Roles existem
  const roleMap = await ensureRoles(prisma, mantenedora.id);

  // 3. Buscar unidade ARARA-CAN (para usuários UNIDADE)
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

  // 4. Buscar todas as unidades (para roles globais)
  const allUnits = await prisma.unit.findMany({
    where: { mantenedoraId: mantenedora.id },
    select: { id: true, code: true, name: true },
  });

  console.log(`✅ Total de unidades: ${allUnits.length}\n`);

  // 5. Hash da senha
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 6. Criar usuários
  const csvLines: string[] = ['Email,Nome,Senha,Perfil,Unidade,Descrição'];
  let created = 0;
  let updated = 0;

  for (const userData of URGENT_USERS) {
    const roleId = roleMap.get(userData.roleType);
    if (!roleId) {
      console.error(`❌ Role ${userData.roleType} não encontrado no mapa`);
      continue;
    }

    // Buscar role completo para pegar o level
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      console.error(`❌ Role ${userData.roleType} não encontrado no banco`);
      continue;
    }

    // Upsert usuário
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      create: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        mantenedoraId: mantenedora.id,
        unitId: userData.unitCode ? araraUnit.id : null,
        status: 'ATIVO',
      },
      update: {
        // Atualizar senha e status se já existir
        password: hashedPassword,
        status: 'ATIVO',
      },
    });

    const isNew = user.createdAt.getTime() === user.updatedAt.getTime();

    // Upsert UserRole
    const userRole = await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: roleId,
        },
      },
      create: {
        userId: user.id,
        roleId: roleId,
        scopeLevel: role.level,
        isActive: true,
      },
      update: {
        scopeLevel: role.level,
        isActive: true,
      },
    });

    // Para roles globais (STAFF_CENTRAL, MANTENEDORA), criar UserRoleUnitScope para todas as unidades
    if (role.level === 'STAFF_CENTRAL' || role.level === 'MANTENEDORA') {
      for (const unit of allUnits) {
        await prisma.userRoleUnitScope.upsert({
          where: {
            userRoleId_unitId: {
              userRoleId: userRole.id,
              unitId: unit.id,
            },
          },
          create: {
            userRoleId: userRole.id,
            unitId: unit.id,
          },
          update: {},
        });
      }
      console.log(`✅ ${isNew ? 'Criado' : 'Atualizado'}: ${userData.email} (${userData.roleType}) - Acesso a ${allUnits.length} unidades`);
    } else if (userData.unitCode) {
      // Para roles de unidade específica, criar UserRoleUnitScope apenas para a unidade
      await prisma.userRoleUnitScope.upsert({
        where: {
          userRoleId_unitId: {
            userRoleId: userRole.id,
            unitId: araraUnit.id,
          },
        },
        create: {
          userRoleId: userRole.id,
          unitId: araraUnit.id,
        },
        update: {},
      });
      console.log(`✅ ${isNew ? 'Criado' : 'Atualizado'}: ${userData.email} (${userData.roleType}) - ${UNIT_CODE}`);
    }

    if (isNew) {
      created++;
    } else {
      updated++;
    }

    const unitDisplay = userData.unitCode ? UNIT_CODE : 'TODAS';
    csvLines.push(
      `${userData.email},"${userData.firstName} ${userData.lastName}",${DEFAULT_PASSWORD},${userData.roleType},${unitDisplay},"${userData.description}"`,
    );
  }

  // 7. Adicionar professoras ao CSV (se já existirem)
  const teachers = await prisma.user.findMany({
    where: {
      email: {
        endsWith: '@cocris.edu.br',
      },
      mantenedoraId: mantenedora.id,
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  console.log(`\n👩‍🏫 Professoras encontradas: ${teachers.length}`);

  for (const teacher of teachers) {
    // Garantir que professora tem role PROFESSOR
    const teacherRoleId = roleMap.get('PROFESSOR');
    if (!teacherRoleId) continue;

    const teacherRole = await prisma.role.findUnique({
      where: { id: teacherRoleId },
    });

    if (!teacherRole) continue;

    // Upsert UserRole
    const userRole = await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: teacher.id,
          roleId: teacherRoleId,
        },
      },
      create: {
        userId: teacher.id,
        roleId: teacherRoleId,
        scopeLevel: teacherRole.level,
        isActive: true,
      },
      update: {
        scopeLevel: teacherRole.level,
        isActive: true,
      },
    });

    // Criar UserRoleUnitScope para ARARA-CAN
    await prisma.userRoleUnitScope.upsert({
      where: {
        userRoleId_unitId: {
          userRoleId: userRole.id,
          unitId: araraUnit.id,
        },
      },
      create: {
        userRoleId: userRole.id,
        unitId: araraUnit.id,
      },
      update: {},
    });

    csvLines.push(
      `${teacher.email},"${teacher.firstName} ${teacher.lastName}",${DEFAULT_PASSWORD},PROFESSOR,${UNIT_CODE},"Professora"`,
    );

    console.log(`  ✅ Role garantido: ${teacher.email} (PROFESSOR)`);
  }

  // 8. Exportar CSV
  const exportsDir = path.dirname(CSV_OUTPUT);
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  fs.writeFileSync(CSV_OUTPUT, csvLines.join('\n'), 'utf-8');

  console.log(`\n📊 Resumo:`);
  console.log(`   - Criados: ${created}`);
  console.log(`   - Atualizados: ${updated}`);
  console.log(`   - Professoras: ${teachers.length}`);
  console.log(`   - Total no CSV: ${csvLines.length - 1}`);
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
