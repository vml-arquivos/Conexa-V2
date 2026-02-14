import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcrypt';
import * as path from 'path';

const prisma = new PrismaClient();

const EXCEL_PATH = path.join(__dirname, '../../data/ALUNOS2026.xlsx');
const UNIT_CODE = 'ARARA-CAN';
const DEFAULT_PASSWORD = 'Cocris@2026';

interface ExcelRow {
  TURMA: string;
  PROFESSORA: string;
  NOME: string;
  'DATA DE NASCIMENTO': string | number;
  SITUAÇÃO: string;
}

async function main() {
  console.log('🚀 Iniciando importação CEPI Arara Canindé 2026...\n');

  // 1. Buscar unidade ARARA-CAN
  const unit = await prisma.unit.findFirst({
    where: { code: UNIT_CODE },
    include: { mantenedora: true },
  });

  if (!unit) {
    throw new Error(`❌ Unidade ${UNIT_CODE} não encontrada. Execute ensure-cocris-units.ts primeiro.`);
  }

  console.log(`✅ Unidade: ${unit.name} (${unit.id})`);
  console.log(`   Mantenedora: ${unit.mantenedora.name}\n`);

  // 2. Ler planilha Excel
  console.log(`📄 Lendo planilha: ${EXCEL_PATH}`);
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

  console.log(`   Total de linhas: ${rows.length}\n`);

  // 3. Extrair turmas e professoras únicas
  const turmasSet = new Set<string>();
  const professorasSet = new Set<string>();

  rows.forEach((row) => {
    if (row.TURMA) turmasSet.add(row.TURMA.trim());
    if (row.PROFESSORA) professorasSet.add(row.PROFESSORA.trim());
  });

  const turmas = Array.from(turmasSet).sort();
  const professoras = Array.from(professorasSet).sort();

  console.log(`📊 Estatísticas:`);
  console.log(`   - Turmas: ${turmas.length}`);
  console.log(`   - Professoras: ${professoras.length}`);
  console.log(`   - Alunos: ${rows.length}\n`);

  // 4. Criar/atualizar turmas
  console.log('📚 Criando turmas...');
  const turmaMap = new Map<string, string>(); // nome -> id

  for (const turmaNome of turmas) {
    const code = turmaNome.toUpperCase().replace(/\s+/g, '-');
    
    let classroom = await prisma.classroom.findFirst({
      where: {
        code,
        unitId: unit.id,
      },
    });

    if (!classroom) {
      classroom = await prisma.classroom.create({
        data: {
          code,
          name: turmaNome,
          unitId: unit.id,
          capacity: 20, // Default
          ageGroupMin: 0,
          ageGroupMax: 5,
        },
      });
      console.log(`   ✅ Criada: ${turmaNome} (${code})`);
    } else {
      console.log(`   🔄 Existente: ${turmaNome} (${code})`);
    }

    turmaMap.set(turmaNome, classroom.id);
  }

  // 5. Criar professoras (Users)
  console.log('\n👩‍🏫 Criando professoras...');
  const professoraMap = new Map<string, string>(); // nome -> userId
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const professoraNome of professoras) {
    const [firstName, ...lastNameParts] = professoraNome.split(' ');
    const lastName = lastNameParts.join(' ') || 'Silva';
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().split(' ')[0]}@cocris.org.br`.replace(/[áàâã]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íì]/g, 'i').replace(/[óòôõ]/g, 'o').replace(/[úù]/g, 'u').replace(/ç/g, 'c');

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          mantenedoraId: unit.mantenedoraId,
          unitId: unit.id,
          status: 'ATIVO',
        },
      });

      // Criar role PROFESSOR
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: 'PROFESSOR', // Placeholder
          scopeLevel: 'PROFESSOR',
          isActive: true,
        },
      });

      console.log(`   ✅ Criada: ${professoraNome} (${email})`);
    } else {
      console.log(`   🔄 Existente: ${professoraNome} (${email})`);
    }

    professoraMap.set(professoraNome, user.id);
  }

  // 6. Vincular professoras às turmas (ClassroomTeacher)
  console.log('\n🔗 Vinculando professoras às turmas...');
  const turmasProfessoras = new Map<string, string>(); // turma -> professora

  rows.forEach((row) => {
    if (row.TURMA && row.PROFESSORA) {
      turmasProfessoras.set(row.TURMA.trim(), row.PROFESSORA.trim());
    }
  });

  for (const [turmaNome, professoraNome] of turmasProfessoras) {
    const classroomId = turmaMap.get(turmaNome);
    const teacherId = professoraMap.get(professoraNome);

    if (!classroomId || !teacherId) continue;

    const existing = await prisma.classroomTeacher.findFirst({
      where: {
        classroomId,
        teacherId,
      },
    });

    if (!existing) {
      await prisma.classroomTeacher.create({
        data: {
          classroomId,
          teacherId,
          role: 'MAIN',
          isActive: true,
        },
      });
      console.log(`   ✅ ${turmaNome} → ${professoraNome}`);
    }
  }

  // 7. Criar alunos (Child) e matrículas (Enrollment)
  console.log('\n👶 Criando alunos e matrículas...');
  let alunosCreated = 0;
  let alunosSkipped = 0;

  for (const row of rows) {
    if (!row.NOME || !row.TURMA) {
      alunosSkipped++;
      continue;
    }

    const childName = row.NOME.trim();
    const [firstName, ...lastNameParts] = childName.split(' ');
    const lastName = lastNameParts.join(' ') || 'Silva';
    const turmaNome = row.TURMA.trim();
    const situacao = row.SITUAÇÃO?.toString().toUpperCase() || 'MATRICULADA';
    const classroomId = turmaMap.get(turmaNome);

    if (!classroomId) {
      console.log(`   ⚠️  Turma não encontrada para: ${childName}`);
      alunosSkipped++;
      continue;
    }

    // Parse data de nascimento
    let birthDate: Date | null = null;
    if (row['DATA DE NASCIMENTO']) {
      try {
        const dateValue = row['DATA DE NASCIMENTO'];
        if (typeof dateValue === 'number') {
          // Excel serial date
          const excelEpoch = new Date(1899, 11, 30);
          birthDate = new Date(excelEpoch.getTime() + dateValue * 86400000);
        } else {
          birthDate = new Date(dateValue);
        }
      } catch (e) {
        console.log(`   ⚠️  Data inválida para: ${childName}`);
      }
    }

    // Verificar se aluno já existe (por nome + unidade)
    let child = await prisma.child.findFirst({
      where: {
        firstName,
        lastName,
        mantenedoraId: unit.mantenedoraId,
      },
    });

    if (!child) {
      child = await prisma.child.create({
        data: {
          firstName,
          lastName,
          dateOfBirth: birthDate || new Date('2020-01-01'),
          mantenedoraId: unit.mantenedoraId,
          unitId: unit.id,
        },
      });
    }

    // Verificar se matrícula já existe
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        childId: child.id,
        classroomId,
      },
    });

    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: {
          childId: child.id,
          classroomId,
          status: situacao.includes('CANCELADO') ? 'CANCELADA' : 'ATIVA',
          enrollmentDate: new Date('2026-01-01'),
        },
      });
      alunosCreated++;
    } else {
      alunosSkipped++;
    }
  }

  console.log(`\n📊 Resumo final:`);
  console.log(`   - Turmas criadas/atualizadas: ${turmas.length}`);
  console.log(`   - Professoras criadas/atualizadas: ${professoras.length}`);
  console.log(`   - Alunos criados: ${alunosCreated}`);
  console.log(`   - Alunos ignorados (duplicados): ${alunosSkipped}`);
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
