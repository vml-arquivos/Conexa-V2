import { PrismaClient, CampoDeExperiencia } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface MatrizEntry {
  date: string;
  weekOfYear: number;
  bimester: number;
  campoDeExperiencia: string;
  objetivoBNCC: string;
  objetivoBNCCCode: string;
  objetivoCurriculo: string;
  intencionalidade: string;
  exemploAtividade: string;
}

interface MatrizData {
  metadata: {
    title: string;
    organization: string;
    year: number;
    version: number;
    description: string;
  };
  entries: MatrizEntry[];
}

function findDatasetPath(filename: string): string {
  const paths = [
    path.resolve(__dirname, '../../data', filename),
    path.resolve(__dirname, '../data', filename),
    `/app/dist/data/${filename}`,
    `/app/data/${filename}`,
  ];

  console.log(`🔍 Searching for dataset: ${filename}`);
  for (const p of paths) {
    if (fs.existsSync(p)) {
      console.log(`🚀 Lendo dados de: ${p}`);
      return p;
    }
  }

  console.error(`❌ Dataset not found. Tried paths:`);
  paths.forEach((p) => console.error(`   - ${p}`));
  process.exit(1);
}

async function main() {
  console.log('🌱 Iniciando seed da Matriz Curricular 2026...\n');

  const dataPath = findDatasetPath('matriz-curricular-2026-sample.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const matrizData: MatrizData = JSON.parse(rawData);

  console.log(`📊 Metadata:`);
  console.log(`   Title: ${matrizData.metadata.title}`);
  console.log(`   Year: ${matrizData.metadata.year}`);
  console.log(`   Version: ${matrizData.metadata.version}\n`);

  // Buscar mantenedora Conexa (criada pelo seed:ensure-cocris-units)
  const mantenedora = await prisma.mantenedora.findFirst({
    where: { name: { contains: 'Conexa', mode: 'insensitive' } },
  });

  if (!mantenedora) {
    console.error('❌ Mantenedora Conexa não encontrada. Execute seed:ensure-cocris-units primeiro.');
    process.exit(1);
  }

  console.log(`✅ Mantenedora encontrada: ${mantenedora.name} (${mantenedora.id})\n`);

  // Criar ou buscar matriz
  let matriz = await prisma.curriculumMatrix.findFirst({
    where: {
      mantenedoraId: mantenedora.id,
      year: matrizData.metadata.year,
    },
  });

  if (!matriz) {
    matriz = await prisma.curriculumMatrix.create({
      data: {
        mantenedoraId: mantenedora.id,
        name: matrizData.metadata.title,
        year: matrizData.metadata.year,
        segment: 'EI01',
        description: matrizData.metadata.description,
        version: matrizData.metadata.version,
      },
    });
    console.log(`✅ Matriz criada: ${matriz.name} (${matriz.id})\n`);
  } else {
    console.log(`✅ Matriz já existe: ${matriz.name} (${matriz.id})\n`);
  }

  // Processar entradas
  let totalCreated = 0;
  let totalSkipped = 0;

  console.log(`📚 Processando ${matrizData.entries.length} entradas...`);

  for (const entry of matrizData.entries) {
    const targetDate = new Date(entry.date);

    // Verificar se entrada já existe (idempotência)
    const existing = await prisma.curriculumMatrixEntry.findFirst({
      where: {
        matrixId: matriz.id,
        date: targetDate,
      },
    });

    if (existing) {
      totalSkipped++;
      continue;
    }

    // Criar entrada
    await prisma.curriculumMatrixEntry.create({
      data: {
        matrixId: matriz.id,
        date: targetDate,
        weekOfYear: entry.weekOfYear,
        dayOfWeek: targetDate.getDay(),
        bimester: entry.bimester,
        campoDeExperiencia: entry.campoDeExperiencia as CampoDeExperiencia,
        objetivoBNCC: entry.objetivoBNCC,
        objetivoBNCCCode: entry.objetivoBNCCCode,
        objetivoCurriculo: entry.objetivoCurriculo,
        intencionalidade: entry.intencionalidade,
        exemploAtividade: entry.exemploAtividade,
      },
    });

    totalCreated++;
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Entradas criadas: ${totalCreated}`);
  console.log(`   ⏭️  Entradas já existentes: ${totalSkipped}`);
  console.log(`\n✅ Seed da Matriz Curricular 2026 concluído com sucesso!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
