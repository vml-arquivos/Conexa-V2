/**
 * create-staff-logins.ts
 * Script para criar logins institucionais (coordenação, direção, nutrição)
 * 
 * Uso:
 *   Dev: ts-node src/scripts/create-staff-logins.ts
 *   Prod: node dist/scripts/create-staff-logins.js
 * 
 * Exporta credenciais em exports/cocris-logins.csv
 */

import { PrismaClient, RoleLevel, RoleType, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const UNIT_CODE = 'ARARA-CAN';
const CSV_PATH = path.join(__dirname, '../../exports/cocris-logins.csv');

// Gerar senha forte
function generateStrongPassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

// Staff members to create
const STAFF_MEMBERS = [
  {
    firstName: 'Carolina',
    lastName: 'de Araujo da Silva',
    email: 'coordenacao.arara@cocris.local',
    roleType: RoleType.UNIDADE_COORDENADOR_PEDAGOGICO,
    roleLevel: RoleLevel.UNIDADE,
    roleName: 'Coordenação Pedagógica',
  },
  {
    firstName: 'Daniel',
    lastName: 'Diretor',
    email: 'direcao.arara@cocris.local',
    roleType: RoleType.UNIDADE_DIRETOR,
    roleLevel: RoleLevel.UNIDADE,
    roleName: 'Diretor',
  },
  {
    firstName: 'Dorli',
    lastName: 'Nutricionista',
    email: 'nutricao@cocris.local',
    roleType: RoleType.UNIDADE_NUTRICIONISTA,
    roleLevel: RoleLevel.UNIDADE,
    roleName: 'Nutricionista',
  },
];

interface CreatedLogin {
  name: string;
  role: string;
  email: string;
  tempPassword: string;
  unitCode: string;
  classroomCode?: string;
}

async function main() {
  console.log('🚀 Iniciando criação de logins institucionais...\n');

  // 1. Buscar mantenedora e unidade
  const mantenedora = await prisma.mantenedora.findFirst({
    where: { cnpj: '00.000.000/0001-00' },
  });

  if (!mantenedora) {
    console.error('❌ Mantenedora COCRIS não encontrada. Execute import-cocris-units.ts primeiro.');
    process.exit(1);
  }

  const unit = await prisma.unit.findFirst({
    where: {
      mantenedoraId: mantenedora.id,
      code: UNIT_CODE,
    },
  });

  if (!unit) {
    console.error(`❌ Unidade ${UNIT_CODE} não encontrada.`);
    process.exit(1);
  }

  console.log(`✅ Mantenedora: ${mantenedora.name}`);
  console.log(`✅ Unidade: ${unit.name} (${unit.code})\n`);

  const createdLogins: CreatedLogin[] = [];
  let created = 0;
  let skipped = 0;

  // 2. Criar logins
  for (const member of STAFF_MEMBERS) {
    try {
      // Verificar se usuário já existe
      const existingUser = await prisma.user.findFirst({
        where: {
          mantenedoraId: mantenedora.id,
          email: member.email,
        },
      });

      if (existingUser) {
        console.log(`⏭️  ${member.firstName} ${member.lastName} (${member.email}) - já existe`);
        skipped++;
        continue;
      }

      // Buscar ou criar role
      let role = await prisma.role.findFirst({
        where: {
          mantenedoraId: mantenedora.id,
          type: member.roleType,
        },
      });

      if (!role) {
        console.log(`📝 Criando role: ${member.roleName}`);
        role = await prisma.role.create({
          data: {
            mantenedoraId: mantenedora.id,
            name: member.roleName,
            level: member.roleLevel,
            type: member.roleType,
            isActive: true,
          },
        });
      }

      // Gerar senha temporária
      const tempPassword = generateStrongPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          mantenedoraId: mantenedora.id,
          unitId: unit.id,
          email: member.email,
          password: hashedPassword,
          firstName: member.firstName,
          lastName: member.lastName,
          status: UserStatus.ATIVO,
          emailVerified: false,
          createdBy: 'import-script',
        },
      });

      // Criar UserRole
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          scopeLevel: member.roleLevel,
        },
      });

      createdLogins.push({
        name: `${member.firstName} ${member.lastName}`,
        role: member.roleName,
        email: member.email,
        tempPassword: tempPassword,
        unitCode: UNIT_CODE,
      });

      console.log(`✅ ${member.firstName} ${member.lastName} (${member.email})`);
      created++;
    } catch (error) {
      console.error(`❌ Erro ao criar ${member.firstName}:`, error.message);
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Criados: ${created}`);
  console.log(`   ⏭️  Ignorados (já existem): ${skipped}`);

  // 3. Exportar credenciais para CSV
  if (createdLogins.length > 0) {
    console.log(`\n📄 Exportando credenciais para: ${CSV_PATH}`);

    // Criar diretório exports se não existir
    const exportsDir = path.dirname(CSV_PATH);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Gerar CSV
    const csvHeader = 'name,role,email,tempPassword,unitCode,classroomCode\n';
    const csvRows = createdLogins.map((login) =>
      `"${login.name}","${login.role}","${login.email}","${login.tempPassword}","${login.unitCode}","${login.classroomCode || ''}"`
    ).join('\n');

    fs.writeFileSync(CSV_PATH, csvHeader + csvRows, 'utf-8');
    console.log(`✅ Credenciais exportadas com sucesso!`);
    console.log(`\n⚠️  IMPORTANTE: Guarde este arquivo em local seguro e delete após distribuir as senhas.`);
  } else {
    console.log('\n⏭️  Nenhuma credencial nova para exportar.');
  }

  console.log('\n✅ Criação de logins concluída!');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
