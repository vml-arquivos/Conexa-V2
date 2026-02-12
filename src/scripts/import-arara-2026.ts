/**
 * import-arara-2026.ts
 * Script para importar turmas, professoras, alunos e matrículas do CEPI Arara Canindé (idempotente)
 * 
 * Uso:
 *   Dev: ts-node src/scripts/import-arara-2026.ts
 *   Prod: node dist/scripts/import-arara-2026.js
 * 
 * Requer: npm install xlsx (para ler Excel)
 */

import { PrismaClient, Gender, EnrollmentStatus, RoleLevel, RoleType, UserStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcrypt';
import * as path from 'path';

const prisma = new PrismaClient();

const UNIT_CODE = 'ARARA-CAN';
const EXCEL_PATH = path.join(__dirname, '../../ALUNOS2026.xlsx');

// Normalizar nomes de turmas (remover espaços extras)
function normalizeTurmaName(name: string): string {
  return name?.trim().toUpperCase() || '';
}

// Normalizar nomes de professoras
function normalizeProfessoraName(name: string): string {
  return name?.trim().toUpperCase() || '';
}

// Gerar slug para email
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '')
    .substring(0, 20);
}

// Mapear situação para EnrollmentStatus
function mapSituacao(situacao: string): EnrollmentStatus {
  const normalized = situacao?.trim().toUpperCase() || '';
  if (normalized === 'MATRICULADA') return EnrollmentStatus.ATIVA;
  if (normalized.includes('CANCELADO') || normalized.includes('CANCELADA')) return EnrollmentStatus.CANCELADA;
  return EnrollmentStatus.PAUSADA;
}

// Mapear sexo para Gender
function mapGender(sexo: string): Gender {
  const normalized = sexo?.trim().toUpperCase() || '';
  if (normalized === 'M') return Gender.MASCULINO;
  if (normalized === 'F') return Gender.FEMININO;
  return Gender.NAO_INFORMADO;
}

async function main() {
  console.log('🚀 Iniciando importação do CEPI Arara Canindé 2026...\n');

  // 1. Buscar mantenedora e unidade
  const mantenedora = await prisma.mantenedora.findFirst({
    where: { cnpj: '00.000.000/0001-00' },
  });

  if (!mantenedora) {
    console.error('❌ Mantenedora COCRIS não encontrada. Execute import-cocris-units.ts primeiro.');
    process.exit(1);
  }

  let unit = await prisma.unit.findFirst({
    where: {
      mantenedoraId: mantenedora.id,
      code: UNIT_CODE,
    },
  });

  if (!unit) {
    console.error(`❌ Unidade ${UNIT_CODE} não encontrada. Execute import-cocris-units.ts primeiro.`);
    process.exit(1);
  }

  console.log(`✅ Mantenedora: ${mantenedora.name}`);
  console.log(`✅ Unidade: ${unit.name} (${unit.code})\n`);

  // 2. Ler Excel
  console.log(`📖 Lendo Excel: ${EXCEL_PATH}`);
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Headers na linha 3 (índice 2)
  const headers = data[2];
  const rows = data.slice(3); // Dados a partir da linha 4

  console.log(`✅ ${rows.length} linhas encontradas\n`);

  // 3. Extrair turmas e professoras únicas
  const turmasMap = new Map<string, string>(); // code -> name
  const professorasMap = new Map<string, string>(); // normalized -> original

  for (const row of rows) {
    const turmaRaw = row[16]; // TURMA
    const professoraRaw = row[17]; // PROFESSORA

    if (turmaRaw) {
      const turmaCode = normalizeTurmaName(turmaRaw).replace(/\s+/g, '-');
      turmasMap.set(turmaCode, turmaRaw.trim());
    }

    if (professoraRaw) {
      const normalized = normalizeProfessoraName(professoraRaw);
      professorasMap.set(normalized, professoraRaw.trim());
    }
  }

  console.log(`📋 ${turmasMap.size} turmas únicas encontradas`);
  console.log(`👩‍🏫 ${professorasMap.size} professoras únicas encontradas\n`);

  // 4. Criar/atualizar turmas
  console.log('📚 Importando turmas...');
  const classroomsMap = new Map<string, string>(); // code -> id
  let turmasCreated = 0;
  let turmasUpdated = 0;

  for (const [code, name] of turmasMap) {
    const existing = await prisma.classroom.findFirst({
      where: {
        unitId: unit.id,
        code: code,
      },
    });

    if (existing) {
      classroomsMap.set(code, existing.id);
      turmasUpdated++;
      console.log(`  ⏭️  ${code} (já existe)`);
    } else {
      const created = await prisma.classroom.create({
        data: {
          unitId: unit.id,
          code: code,
          name: name,
          ageGroupMin: 0,
          ageGroupMax: 48,
          capacity: 25,
          isActive: true,
          createdBy: 'import-script',
        },
      });
      classroomsMap.set(code, created.id);
      turmasCreated++;
      console.log(`  ✅ ${code} - ${name}`);
    }
  }

  console.log(`\n📊 Turmas: ${turmasCreated} criadas, ${turmasUpdated} existentes\n`);

  // 5. Buscar ou criar role PROFESSOR
  let professorRole = await prisma.role.findFirst({
    where: {
      mantenedoraId: mantenedora.id,
      type: RoleType.PROFESSOR,
    },
  });

  if (!professorRole) {
    console.log('📝 Criando role PROFESSOR...');
    professorRole = await prisma.role.create({
      data: {
        mantenedoraId: mantenedora.id,
        name: 'Professor',
        level: RoleLevel.PROFESSOR,
        type: RoleType.PROFESSOR,
        isActive: true,
      },
    });
    console.log('✅ Role PROFESSOR criada\n');
  }

  // 6. Criar/atualizar professoras
  console.log('👩‍🏫 Importando professoras...');
  const professorasIdMap = new Map<string, string>(); // normalized -> userId
  let professorasCreated = 0;
  let professorasUpdated = 0;

  for (const [normalized, original] of professorasMap) {
    const [firstName, ...lastNameParts] = original.split(' ');
    const lastName = lastNameParts.join(' ') || 'Silva';
    const slug = generateSlug(original);
    const email = `${slug}@cocris.local`;

    const existing = await prisma.user.findFirst({
      where: {
        mantenedoraId: mantenedora.id,
        email: email,
      },
    });

    if (existing) {
      professorasIdMap.set(normalized, existing.id);
      professorasUpdated++;
      console.log(`  ⏭️  ${original} (${email})`);
    } else {
      const hashedPassword = await bcrypt.hash('Cocris@2026', 10);
      const user = await prisma.user.create({
        data: {
          mantenedoraId: mantenedora.id,
          unitId: unit.id,
          email: email,
          password: hashedPassword,
          firstName: firstName,
          lastName: lastName,
          status: UserStatus.ATIVO,
          createdBy: 'import-script',
        },
      });

      // Criar UserRole
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: professorRole.id,
          scopeLevel: RoleLevel.PROFESSOR,
        },
      });

      professorasIdMap.set(normalized, user.id);
      professorasCreated++;
      console.log(`  ✅ ${original} (${email})`);
    }
  }

  console.log(`\n📊 Professoras: ${professorasCreated} criadas, ${professorasUpdated} existentes\n`);

  // 7. Importar alunos e matrículas
  console.log('👶 Importando alunos e matrículas...');
  let childrenCreated = 0;
  let childrenUpdated = 0;
  let enrollmentsCreated = 0;
  let enrollmentsUpdated = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      const alunoNome = row[0]; // ALUNO
      const sexo = row[3]; // SEXO
      const nascimento = row[5]; // NASCIMENTO
      const codAluno = row[8]; // COD ALUNO
      const entrada = row[9]; // ENTRADA
      const situacao = row[10]; // SITUAÇÃO
      const saida = row[14]; // SAIDA
      const turmaRaw = row[16]; // TURMA
      const professoraRaw = row[17]; // PROFESSORA

      if (!alunoNome || !nascimento || !turmaRaw) {
        skipped++;
        continue;
      }

      const [firstName, ...lastNameParts] = alunoNome.trim().split(' ');
      const lastName = lastNameParts.join(' ') || 'Sobrenome';
      const turmaCode = normalizeTurmaName(turmaRaw).replace(/\s+/g, '-');
      const classroomId = classroomsMap.get(turmaCode);

      if (!classroomId) {
        console.warn(`  ⚠️  Turma não encontrada: ${turmaRaw}`);
        skipped++;
        continue;
      }

      // Converter data de nascimento
      let dateOfBirth: Date;
      if (typeof nascimento === 'number') {
        // Excel serial date
        dateOfBirth = new Date((nascimento - 25569) * 86400 * 1000);
      } else if (nascimento instanceof Date) {
        dateOfBirth = nascimento;
      } else {
        dateOfBirth = new Date(nascimento);
      }

      // Buscar ou criar child
      let child = await prisma.child.findFirst({
        where: {
          mantenedoraId: mantenedora.id,
          unitId: unit.id,
          firstName: firstName,
          lastName: lastName,
          dateOfBirth: dateOfBirth,
        },
      });

      if (!child) {
        child = await prisma.child.create({
          data: {
            mantenedoraId: mantenedora.id,
            unitId: unit.id,
            firstName: firstName,
            lastName: lastName,
            dateOfBirth: dateOfBirth,
            gender: mapGender(sexo),
            isActive: true,
            createdBy: 'import-script',
          },
        });
        childrenCreated++;
      } else {
        childrenUpdated++;
      }

      // Converter data de entrada
      let enrollmentDate: Date;
      if (typeof entrada === 'number') {
        enrollmentDate = new Date((entrada - 25569) * 86400 * 1000);
      } else if (entrada instanceof Date) {
        enrollmentDate = entrada;
      } else {
        enrollmentDate = new Date(entrada || Date.now());
      }

      // Converter data de saída
      let withdrawalDate: Date | null = null;
      if (saida) {
        if (typeof saida === 'number') {
          withdrawalDate = new Date((saida - 25569) * 86400 * 1000);
        } else if (saida instanceof Date) {
          withdrawalDate = saida;
        } else {
          withdrawalDate = new Date(saida);
        }
      }

      // Buscar ou criar enrollment
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          childId: child.id,
          classroomId: classroomId,
        },
      });

      const enrollmentStatus = mapSituacao(situacao);

      if (existingEnrollment) {
        await prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            status: enrollmentStatus,
            withdrawalDate: withdrawalDate,
            updatedBy: 'import-script',
          },
        });
        enrollmentsUpdated++;
      } else {
        await prisma.enrollment.create({
          data: {
            childId: child.id,
            classroomId: classroomId,
            enrollmentDate: enrollmentDate,
            withdrawalDate: withdrawalDate,
            status: enrollmentStatus,
            createdBy: 'import-script',
          },
        });
        enrollmentsCreated++;
      }

      // Criar vínculo ClassroomTeacher (se professora especificada)
      if (professoraRaw) {
        const normalizedProf = normalizeProfessoraName(professoraRaw);
        const teacherId = professorasIdMap.get(normalizedProf);

        if (teacherId) {
          const existingLink = await prisma.classroomTeacher.findFirst({
            where: {
              classroomId: classroomId,
              teacherId: teacherId,
            },
          });

          if (!existingLink) {
            await prisma.classroomTeacher.create({
              data: {
                classroomId: classroomId,
                teacherId: teacherId,
                role: 'MAIN',
                isActive: true,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error(`  ❌ Erro ao processar linha:`, error.message);
      skipped++;
    }
  }

  console.log('\n📊 Resumo da importação:');
  console.log(`   👶 Crianças criadas: ${childrenCreated}`);
  console.log(`   👶 Crianças atualizadas: ${childrenUpdated}`);
  console.log(`   📝 Matrículas criadas: ${enrollmentsCreated}`);
  console.log(`   📝 Matrículas atualizadas: ${enrollmentsUpdated}`);
  console.log(`   ⏭️  Linhas ignoradas: ${skipped}`);

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
