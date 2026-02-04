import { PrismaClient, RoleLevel, RoleType, UserStatus, PlanningStatus, PlanningType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...\n');

  // Fixed IDs for reproducibility
  const MANTENEDORA_ID = 'seed-mantenedora-001';
  const UNIT_ID = 'seed-unit-001';
  const CLASSROOM_ID = 'seed-classroom-001';
  const PLANNING_ID = 'seed-planning-001';
  const CURRICULUM_MATRIX_ID = 'seed-matrix-001';

  const PASSWORD = 'Conexa#1234';
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // 1. Create Mantenedora
  const mantenedora = await prisma.mantenedora.upsert({
    where: { id: MANTENEDORA_ID },
    update: {},
    create: {
      id: MANTENEDORA_ID,
      name: 'Mantenedora Seed',
      cnpj: '00000000000191',
      email: 'contato@seed.local',
      phone: '11999999999',
      isActive: true,
    },
  });
  console.log('✅ Mantenedora created:', mantenedora.id);

  // 2. Create Unit
  const unit = await prisma.unit.upsert({
    where: { id: UNIT_ID },
    update: {},
    create: {
      id: UNIT_ID,
      mantenedoraId: MANTENEDORA_ID,
      name: 'Unidade Seed',
      code: 'UNIT-001',
      address: 'Rua Seed, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
      phone: '11988888888',
      email: 'unidade@seed.local',
      isActive: true,
    },
  });
  console.log('✅ Unit created:', unit.id);

  // 3. Create Classroom
  const classroom = await prisma.classroom.upsert({
    where: { id: CLASSROOM_ID },
    update: {},
    create: {
      id: CLASSROOM_ID,
      unitId: UNIT_ID,
      name: 'Turma Seed A',
      code: 'TURMA-A',
      ageGroupMin: 0,
      ageGroupMax: 48,
      capacity: 15,
      isActive: true,
    },
  });
  console.log('✅ Classroom created:', classroom.id);

  // 4. Create Roles
  const developerRole = await prisma.role.upsert({
    where: { mantenedoraId_type: { mantenedoraId: MANTENEDORA_ID, type: RoleType.DEVELOPER } },
    update: {},
    create: {
      mantenedoraId: MANTENEDORA_ID,
      name: 'Developer',
      level: RoleLevel.DEVELOPER,
      type: RoleType.DEVELOPER,
      isActive: true,
      isCustom: false,
    },
  });

  const coordenadorRole = await prisma.role.upsert({
    where: { mantenedoraId_type: { mantenedoraId: MANTENEDORA_ID, type: RoleType.STAFF_CENTRAL_PEDAGOGICO } },
    update: {},
    create: {
      mantenedoraId: MANTENEDORA_ID,
      name: 'Coordenador Pedagógico',
      level: RoleLevel.STAFF_CENTRAL,
      type: RoleType.STAFF_CENTRAL_PEDAGOGICO,
      isActive: true,
      isCustom: false,
    },
  });

  const professorRole = await prisma.role.upsert({
    where: { mantenedoraId_type: { mantenedoraId: MANTENEDORA_ID, type: RoleType.PROFESSOR } },
    update: {},
    create: {
      mantenedoraId: MANTENEDORA_ID,
      name: 'Professor',
      level: RoleLevel.PROFESSOR,
      type: RoleType.PROFESSOR,
      isActive: true,
      isCustom: false,
    },
  });

  console.log('✅ Roles created');

  // 5. Create Users
  const developer = await prisma.user.upsert({
    where: { email: 'developer@conexa.local' },
    update: {},
    create: {
      mantenedoraId: MANTENEDORA_ID,
      email: 'developer@conexa.local',
      password: passwordHash,
      firstName: 'Dev',
      lastName: 'Seed',
      status: UserStatus.ATIVO,
      emailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: developer.id, roleId: developerRole.id } },
    update: {},
    create: {
      userId: developer.id,
      roleId: developerRole.id,
      scopeLevel: RoleLevel.DEVELOPER,
    },
  });

  const coordenador = await prisma.user.upsert({
    where: { email: 'coordenador@conexa.local' },
    update: {},
    create: {
      mantenedoraId: MANTENEDORA_ID,
      unitId: UNIT_ID,
      email: 'coordenador@conexa.local',
      password: passwordHash,
      firstName: 'Coordenador',
      lastName: 'Seed',
      status: UserStatus.ATIVO,
      emailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: coordenador.id, roleId: coordenadorRole.id } },
    update: {},
    create: {
      userId: coordenador.id,
      roleId: coordenadorRole.id,
      scopeLevel: RoleLevel.STAFF_CENTRAL,
    },
  });

  const professor = await prisma.user.upsert({
    where: { email: 'professor@conexa.local' },
    update: {},
    create: {
      mantenedoraId: MANTENEDORA_ID,
      unitId: UNIT_ID,
      email: 'professor@conexa.local',
      password: passwordHash,
      firstName: 'Professor',
      lastName: 'Seed',
      status: UserStatus.ATIVO,
      emailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: professor.id, roleId: professorRole.id } },
    update: {},
    create: {
      userId: professor.id,
      roleId: professorRole.id,
      scopeLevel: RoleLevel.PROFESSOR,
    },
  });

  // Link professor to classroom
  await prisma.classroomTeacher.upsert({
    where: { classroomId_teacherId: { classroomId: CLASSROOM_ID, teacherId: professor.id } },
    update: {},
    create: {
      classroomId: CLASSROOM_ID,
      teacherId: professor.id,
      role: 'MAIN',
      isActive: true,
    },
  });

  console.log('✅ Users created:');
  console.log('   - developer@conexa.local');
  console.log('   - coordenador@conexa.local');
  console.log('   - professor@conexa.local');

  // 6. Create CurriculumMatrix
  const matrix = await prisma.curriculumMatrix.upsert({
    where: { id: CURRICULUM_MATRIX_ID },
    update: {},
    create: {
      id: CURRICULUM_MATRIX_ID,
      mantenedoraId: MANTENEDORA_ID,
      name: 'Matriz Curricular Seed',
      year: 2026,
      segment: 'EI01',
      description: 'Matriz para testes do runbook v1.0',
      isActive: true,
      createdBy: developer.id,
    },
  });
  console.log('✅ CurriculumMatrix created:', matrix.id);

  // 7. Create Planning (EM_EXECUCAO status for DiaryEvent tests)
  const planning = await prisma.planning.upsert({
    where: { id: PLANNING_ID },
    update: {},
    create: {
      id: PLANNING_ID,
      mantenedoraId: MANTENEDORA_ID,
      unitId: UNIT_ID,
      classroomId: CLASSROOM_ID,
      curriculumMatrixId: CURRICULUM_MATRIX_ID,
      title: 'Planejamento Seed Ativo',
      type: PlanningType.SEMANAL,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
      status: PlanningStatus.EM_EXECUCAO,
      createdBy: professor.id,
    },
  });
  console.log('✅ Planning created:', planning.id, '(status: EM_EXECUCAO)');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📋 CREDENTIALS:');
  console.log('   Email: developer@conexa.local | coordenador@conexa.local | professor@conexa.local');
  console.log('   Password: Conexa#1234\n');
  console.log('📦 IDs for testing:');
  console.log(`   mantenedoraId: ${MANTENEDORA_ID}`);
  console.log(`   unitId: ${UNIT_ID}`);
  console.log(`   classroomId: ${CLASSROOM_ID}`);
  console.log(`   curriculumMatrixId: ${CURRICULUM_MATRIX_ID}`);
  console.log(`   planningId: ${PLANNING_ID}\n`);
  console.log('🔑 Next step: Login via POST /auth/login to obtain JWT tokens');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
