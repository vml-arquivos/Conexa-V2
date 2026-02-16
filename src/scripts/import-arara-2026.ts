import { PrismaClient, EnrollmentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Cocris@2026';

/**
 * Encontra o path do dataset com fallback robusto para todos os ambientes
 * Ordem de tentativa:
 * 1. ../../data (desenvolvimento - TS local)
 * 2. ../data (dist padrão - após build)
 * 3. /app/dist/data (Docker - após build)
 * 4. /app/data (Docker - raiz)
 */
function findDatasetPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../data', filename),  // TS local
    path.resolve(__dirname, '../data', filename),     // dist padrão
    path.join('/app/dist/data', filename),            // Docker dist
    path.join('/app/data', filename),                 // Docker raiz
  ];

  console.log(`🔍 Searching for dataset: ${filename}`);
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`🚀 Lendo dados de: ${candidate}`);
      return candidate;
    }
  }

  console.error(`❌ Dataset not found: ${filename}`);
  console.error(`Tried paths:`);
  candidates.forEach(p => console.error(`  - ${p}`));
  process.exit(1);
}

const JSON_PATH = findDatasetPath('arara-2026-alunos.json');

interface TurmaData {
  nome: string;
  code: string;
  capacity: number;
  ageGroupMin: number;
  ageGroupMax: number;
  professora: string;
}

interface AlunoData {
  turma: string;
  nome: string;
  dataNascimento: string;
  situacao: string;
}

interface ImportData {
  unitCode: string;
  year: number;
  turmas: TurmaData[];
  alunos: AlunoData[];
}

async function main() {
  console.log('🚀 Iniciando importação CEPI Arara Canindé 2026...\n');

  // 1. Ler arquivo JSON
  console.log(`📄 Lendo arquivo: ${JSON_PATH}`);
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`❌ Arquivo não encontrado: ${JSON_PATH}`);
  }

  const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
  const data: ImportData = JSON.parse(rawData);

  console.log(
    `✅ Dados carregados: ${data.turmas.length} turmas, ${data.alunos.length} alunos\n`,
  );

  // 2. Buscar unidade
  const unit = await prisma.unit.findFirst({
    where: { code: data.unitCode },
    include: { mantenedora: true },
  });

  if (!unit) {
    throw new Error(
      `❌ Unidade ${data.unitCode} não encontrada. Execute ensure-cocris-units.ts primeiro.`,
    );
  }

  console.log(`✅ Unidade: ${unit.name} (${unit.id})`);
  console.log(`   Mantenedora: ${unit.mantenedora.name}\n`);

  // 3. Criar/atualizar turmas
  console.log('📚 Criando/atualizando turmas...');
  const turmaMap = new Map<string, string>(); // nome -> id

  for (const turmaData of data.turmas) {
    let classroom = await prisma.classroom.findFirst({
      where: {
        code: turmaData.code,
        unitId: unit.id,
      },
    });

    if (!classroom) {
      classroom = await prisma.classroom.create({
        data: {
          code: turmaData.code,
          name: turmaData.nome,
          unitId: unit.id,
          capacity: turmaData.capacity,
          ageGroupMin: turmaData.ageGroupMin,
          ageGroupMax: turmaData.ageGroupMax,
        },
      });
      console.log(`   ✅ Criada: ${turmaData.nome} (${turmaData.code})`);
    } else {
      // Atualizar capacidade e faixa etária se necessário
      await prisma.classroom.update({
        where: { id: classroom.id },
        data: {
          capacity: turmaData.capacity,
          ageGroupMin: turmaData.ageGroupMin,
          ageGroupMax: turmaData.ageGroupMax,
        },
      });
      console.log(`   🔄 Atualizada: ${turmaData.nome} (${turmaData.code})`);
    }

    turmaMap.set(turmaData.nome, classroom.id);
  }

  // 4. Criar professoras (Users)
  console.log('\n👩‍🏫 Criando/atualizando professoras...');
  const professoraMap = new Map<string, string>(); // nome -> userId
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const professorasUnicas = Array.from(
    new Set(data.turmas.map((t) => t.professora)),
  );

  for (const professoraNome of professorasUnicas) {
    const email = professoraNome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, '.')
      .concat('@cocris.edu.br');

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Separar firstName e lastName
      const nameParts = professoraNome.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          mantenedoraId: unit.mantenedoraId,
        },
      });
      console.log(`   ✅ Criada: ${professoraNome} (${email})`);
    } else {
      console.log(`   🔄 Existente: ${professoraNome} (${email})`);
    }

    professoraMap.set(professoraNome, user.id);
  }

  // 5. Atribuir professoras às turmas
  console.log('\n🔗 Atribuindo professoras às turmas...');
  for (const turmaData of data.turmas) {
    const classroomId = turmaMap.get(turmaData.nome);
    const teacherId = professoraMap.get(turmaData.professora);

    if (!classroomId || !teacherId) {
      console.log(
        `   ⚠️  Pulando ${turmaData.nome} - turma ou professora não encontrada`,
      );
      continue;
    }

    // Verificar se já existe atribuição
    const existingAssignment = await prisma.classroomTeacher.findFirst({
      where: {
        classroomId,
        teacherId,
      },
    });

    if (!existingAssignment) {
      await prisma.classroomTeacher.create({
        data: {
          classroomId,
          teacherId,
          role: 'MAIN',
        },
      });
      console.log(
        `   ✅ ${turmaData.professora} → ${turmaData.nome}`,
      );
    } else {
      console.log(
        `   🔄 Existente: ${turmaData.professora} → ${turmaData.nome}`,
      );
    }
  }

  // 6. Criar crianças (Child)
  console.log('\n👶 Criando/atualizando crianças...');
  let createdCount = 0;
  let updatedCount = 0;

  for (const alunoData of data.alunos) {
    const classroomId = turmaMap.get(alunoData.turma);

    if (!classroomId) {
      console.log(`   ⚠️  Pulando ${alunoData.nome} - turma não encontrada`);
      continue;
    }

    const birthDate = new Date(alunoData.dataNascimento);

    // Separar firstName e lastName
    const nameParts = alunoData.nome.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    // Verificar se criança já existe (por firstName + lastName + birthDate + unidade)
    const existingChild = await prisma.child.findFirst({
      where: {
        firstName,
        lastName,
        dateOfBirth: birthDate,
        unitId: unit.id,
      },
    });

    let childId: string;

    if (!existingChild) {
      const newChild = await prisma.child.create({
        data: {
          firstName,
          lastName,
          dateOfBirth: birthDate,
          unitId: unit.id,
          mantenedoraId: unit.mantenedoraId,
        },
      });
      childId = newChild.id;
      createdCount++;
    } else {
      childId = existingChild.id;
      updatedCount++;
    }

    // Criar ou atualizar enrollment
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        childId,
        classroomId,
      },
    });

    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: {
          childId,
          classroomId,
          enrollmentDate: new Date(`${data.year}-02-01`),
          status:
            alunoData.situacao === 'ATIVO'
              ? EnrollmentStatus.ATIVA
              : EnrollmentStatus.CANCELADA,
        },
      });
    } else {
      // Atualizar status se mudou
      await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status:
            alunoData.situacao === 'ATIVO'
              ? EnrollmentStatus.ATIVA
              : EnrollmentStatus.CANCELADA,
        },
      });
    }
  }

  console.log(`   ✅ Criados: ${createdCount}`);
  console.log(`   🔄 Atualizados: ${updatedCount}`);

  // 7. Roles serão atribuídos pelo script create-urgent-logins.ts
  console.log('\n✅ Professoras criadas. Execute create-urgent-logins.ts para atribuir roles.');

  console.log('\n✅ Importação concluída com sucesso!');
  console.log(`\n📊 Resumo:`);
  console.log(`   - Turmas: ${data.turmas.length}`);
  console.log(`   - Professoras: ${professorasUnicas.length}`);
  console.log(`   - Crianças criadas: ${createdCount}`);
  console.log(`   - Crianças atualizadas: ${updatedCount}`);
  console.log(`\n🔐 Senha padrão: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('❌ Erro na importação:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
