-- CreateEnum
CREATE TYPE "RoleLevel" AS ENUM ('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL', 'UNIDADE', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('DEVELOPER', 'MANTENEDORA_ADMIN', 'MANTENEDORA_FINANCEIRO', 'STAFF_CENTRAL_PEDAGOGICO', 'STAFF_CENTRAL_PSICOLOGIA', 'UNIDADE_DIRETOR', 'UNIDADE_COORDENADOR_PEDAGOGICO', 'UNIDADE_ADMINISTRATIVO', 'UNIDADE_NUTRICIONISTA', 'PROFESSOR', 'PROFESSOR_AUXILIAR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO', 'CONVIDADO');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ATIVA', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "DiaryEventType" AS ENUM ('ATIVIDADE_PEDAGOGICA', 'REFEICAO', 'HIGIENE', 'SONO', 'COMPORTAMENTO', 'DESENVOLVIMENTO', 'SAUDE', 'FAMILIA', 'OBSERVACAO', 'AVALIACAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "DiaryEventStatus" AS ENUM ('RASCUNHO', 'PUBLICADO', 'REVISADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "PlanningType" AS ENUM ('SEMANAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('RASCUNHO', 'PUBLICADO', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENTE', 'AUSENTE', 'JUSTIFICADO', 'ATRASO');

-- CreateEnum
CREATE TYPE "MaterialRequestType" AS ENUM ('CONSUMIVEL', 'PERMANENTE', 'HIGIENE', 'LIMPEZA', 'PEDAGOGICO', 'ALIMENTACAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('RASCUNHO', 'SOLICITADO', 'APROVADO', 'REJEITADO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "DietaryRestrictionType" AS ENUM ('ALERGIA', 'INTOLERANCIA', 'PREFERENCIA', 'RELIGIOSA', 'MEDICA', 'OUTRA');

-- CreateEnum
CREATE TYPE "AuditLogAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE', 'ROLE_CHANGE');

-- CreateEnum
CREATE TYPE "AuditLogEntity" AS ENUM ('USER', 'CHILD', 'ENROLLMENT', 'CLASSROOM', 'PLANNING', 'DIARY_EVENT', 'ATTENDANCE', 'MATERIAL_REQUEST', 'DIETARY_RESTRICTION', 'ROLE', 'PERMISSION', 'UNIT', 'MANTENEDORA');

-- CreateEnum
CREATE TYPE "ClassroomTeacherRole" AS ENUM ('MAIN', 'AUXILIARY', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "CampoDeExperiencia" AS ENUM ('O_EU_O_OUTRO_E_O_NOS', 'CORPO_GESTOS_E_MOVIMENTOS', 'TRACOS_SONS_CORES_E_FORMAS', 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES');

-- CreateTable
CREATE TABLE "Mantenedora" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "website" VARCHAR(255),
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "zipCode" VARCHAR(10),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "maxUnits" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),

    CONSTRAINT "Mantenedora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "zipCode" VARCHAR(10),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "ageGroupsServed" TEXT NOT NULL DEFAULT '0-4',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "cpf" VARCHAR(14),
    "phone" VARCHAR(20),
    "status" "UserStatus" NOT NULL DEFAULT 'ATIVO',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "level" "RoleLevel" NOT NULL,
    "type" "RoleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scopeLevel" "RoleLevel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleUnitScope" (
    "id" TEXT NOT NULL,
    "userRoleId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleUnitScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'NAO_INFORMADO',
    "cpf" VARCHAR(14),
    "rg" VARCHAR(20),
    "emergencyContactName" VARCHAR(255),
    "emergencyContactPhone" VARCHAR(20),
    "bloodType" VARCHAR(5),
    "allergies" TEXT,
    "medicalConditions" TEXT,
    "medicationNeeds" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL,
    "withdrawalDate" TIMESTAMP(3),
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ATIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "ageGroupMin" INTEGER NOT NULL DEFAULT 0,
    "ageGroupMax" INTEGER NOT NULL DEFAULT 48,
    "capacity" INTEGER NOT NULL DEFAULT 15,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomTeacher" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "role" "ClassroomTeacherRole" NOT NULL DEFAULT 'MAIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumMatrix" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "segment" VARCHAR(10) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "sourceUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),

    CONSTRAINT "CurriculumMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumMatrixEntry" (
    "id" TEXT NOT NULL,
    "matrixId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weekOfYear" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "bimester" INTEGER,
    "campoDeExperiencia" "CampoDeExperiencia" NOT NULL,
    "objetivoBNCC" TEXT NOT NULL,
    "objetivoBNCCCode" VARCHAR(20),
    "objetivoCurriculo" TEXT NOT NULL,
    "intencionalidade" TEXT,
    "exemploAtividade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumMatrixEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningTemplate" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sections" JSONB NOT NULL,
    "fields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planning" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "templateId" TEXT,
    "curriculumMatrixId" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "PlanningType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "objectives" TEXT,
    "activities" JSONB,
    "resources" JSONB,
    "evaluation" TEXT,
    "bnccAreas" JSONB,
    "curriculumAlignment" TEXT,
    "pedagogicalContent" JSONB,
    "status" "PlanningStatus" NOT NULL DEFAULT 'RASCUNHO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Planning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryEvent" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "planningId" TEXT,
    "curriculumEntryId" TEXT,
    "type" "DiaryEventType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "observations" TEXT,
    "developmentNotes" TEXT,
    "behaviorNotes" TEXT,
    "tags" JSONB,
    "aiContext" JSONB,
    "mediaUrls" JSONB,
    "status" "DiaryEventStatus" NOT NULL DEFAULT 'RASCUNHO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "reviewedBy" VARCHAR(255),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "DiaryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recordedBy" VARCHAR(255),

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietaryRestriction" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "DietaryRestrictionType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "severity" VARCHAR(50),
    "allowedFoods" TEXT,
    "forbiddenFoods" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),

    CONSTRAINT "DietaryRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequest" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "classroomId" TEXT,
    "code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "MaterialRequestType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION,
    "status" "RequestStatus" NOT NULL DEFAULT 'RASCUNHO',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredDate" TIMESTAMP(3),
    "approvedDate" TIMESTAMP(3),
    "deliveredDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255),
    "approvedBy" VARCHAR(255),

    CONSTRAINT "MaterialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minimumQuantity" INTEGER NOT NULL DEFAULT 0,
    "location" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT,
    "userId" TEXT,
    "action" "AuditLogAction" NOT NULL,
    "entity" "AuditLogEntity" NOT NULL,
    "entityId" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "changes" JSONB,
    "ipAddress" VARCHAR(50),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportBase" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "reportType" VARCHAR(50) NOT NULL,
    "period" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "attendanceRate" DOUBLE PRECISION,
    "developmentSummary" JSONB,
    "pedagogicalNotes" TEXT,
    "familyObservations" TEXT,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIContext" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "summary" TEXT NOT NULL,
    "recentEvents" JSONB NOT NULL,
    "trends" JSONB,
    "suggestedActions" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mantenedora_cnpj_key" ON "Mantenedora"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Mantenedora_email_key" ON "Mantenedora"("email");

-- CreateIndex
CREATE INDEX "Mantenedora_cnpj_idx" ON "Mantenedora"("cnpj");

-- CreateIndex
CREATE INDEX "Mantenedora_isActive_idx" ON "Mantenedora"("isActive");

-- CreateIndex
CREATE INDEX "Unit_mantenedoraId_idx" ON "Unit"("mantenedoraId");

-- CreateIndex
CREATE INDEX "Unit_isActive_idx" ON "Unit"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_mantenedoraId_code_key" ON "Unit"("mantenedoraId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE INDEX "User_mantenedoraId_idx" ON "User"("mantenedoraId");

-- CreateIndex
CREATE INDEX "User_unitId_idx" ON "User"("unitId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "Role_mantenedoraId_idx" ON "Role"("mantenedoraId");

-- CreateIndex
CREATE INDEX "Role_level_idx" ON "Role"("level");

-- CreateIndex
CREATE UNIQUE INDEX "Role_mantenedoraId_type_key" ON "Role"("mantenedoraId", "type");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "UserRole_scopeLevel_idx" ON "UserRole"("scopeLevel");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "UserRoleUnitScope_userRoleId_idx" ON "UserRoleUnitScope"("userRoleId");

-- CreateIndex
CREATE INDEX "UserRoleUnitScope_unitId_idx" ON "UserRoleUnitScope"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleUnitScope_userRoleId_unitId_key" ON "UserRoleUnitScope"("userRoleId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "Permission_resource_idx" ON "Permission"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Child_cpf_key" ON "Child"("cpf");

-- CreateIndex
CREATE INDEX "Child_mantenedoraId_idx" ON "Child"("mantenedoraId");

-- CreateIndex
CREATE INDEX "Child_unitId_idx" ON "Child"("unitId");

-- CreateIndex
CREATE INDEX "Child_isActive_idx" ON "Child"("isActive");

-- CreateIndex
CREATE INDEX "Child_dateOfBirth_idx" ON "Child"("dateOfBirth");

-- CreateIndex
CREATE INDEX "Enrollment_childId_idx" ON "Enrollment"("childId");

-- CreateIndex
CREATE INDEX "Enrollment_classroomId_idx" ON "Enrollment"("classroomId");

-- CreateIndex
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

-- CreateIndex
CREATE INDEX "Enrollment_enrollmentDate_idx" ON "Enrollment"("enrollmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_childId_classroomId_key" ON "Enrollment"("childId", "classroomId");

-- CreateIndex
CREATE INDEX "Classroom_unitId_idx" ON "Classroom"("unitId");

-- CreateIndex
CREATE INDEX "Classroom_isActive_idx" ON "Classroom"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_unitId_code_key" ON "Classroom"("unitId", "code");

-- CreateIndex
CREATE INDEX "ClassroomTeacher_classroomId_idx" ON "ClassroomTeacher"("classroomId");

-- CreateIndex
CREATE INDEX "ClassroomTeacher_teacherId_idx" ON "ClassroomTeacher"("teacherId");

-- CreateIndex
CREATE INDEX "ClassroomTeacher_role_idx" ON "ClassroomTeacher"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomTeacher_classroomId_teacherId_key" ON "ClassroomTeacher"("classroomId", "teacherId");

-- CreateIndex
CREATE INDEX "CurriculumMatrix_mantenedoraId_idx" ON "CurriculumMatrix"("mantenedoraId");

-- CreateIndex
CREATE INDEX "CurriculumMatrix_year_idx" ON "CurriculumMatrix"("year");

-- CreateIndex
CREATE INDEX "CurriculumMatrix_segment_idx" ON "CurriculumMatrix"("segment");

-- CreateIndex
CREATE INDEX "CurriculumMatrix_isActive_idx" ON "CurriculumMatrix"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumMatrix_mantenedoraId_year_segment_version_key" ON "CurriculumMatrix"("mantenedoraId", "year", "segment", "version");

-- CreateIndex
CREATE INDEX "CurriculumMatrixEntry_matrixId_idx" ON "CurriculumMatrixEntry"("matrixId");

-- CreateIndex
CREATE INDEX "CurriculumMatrixEntry_date_idx" ON "CurriculumMatrixEntry"("date");

-- CreateIndex
CREATE INDEX "CurriculumMatrixEntry_weekOfYear_idx" ON "CurriculumMatrixEntry"("weekOfYear");

-- CreateIndex
CREATE INDEX "CurriculumMatrixEntry_campoDeExperiencia_idx" ON "CurriculumMatrixEntry"("campoDeExperiencia");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumMatrixEntry_matrixId_date_key" ON "CurriculumMatrixEntry"("matrixId", "date");

-- CreateIndex
CREATE INDEX "PlanningTemplate_isActive_idx" ON "PlanningTemplate"("isActive");

-- CreateIndex
CREATE INDEX "Planning_mantenedoraId_idx" ON "Planning"("mantenedoraId");

-- CreateIndex
CREATE INDEX "Planning_unitId_idx" ON "Planning"("unitId");

-- CreateIndex
CREATE INDEX "Planning_classroomId_idx" ON "Planning"("classroomId");

-- CreateIndex
CREATE INDEX "Planning_status_idx" ON "Planning"("status");

-- CreateIndex
CREATE INDEX "Planning_startDate_idx" ON "Planning"("startDate");

-- CreateIndex
CREATE INDEX "Planning_endDate_idx" ON "Planning"("endDate");

-- CreateIndex
CREATE INDEX "DiaryEvent_mantenedoraId_idx" ON "DiaryEvent"("mantenedoraId");

-- CreateIndex
CREATE INDEX "DiaryEvent_unitId_idx" ON "DiaryEvent"("unitId");

-- CreateIndex
CREATE INDEX "DiaryEvent_classroomId_idx" ON "DiaryEvent"("classroomId");

-- CreateIndex
CREATE INDEX "DiaryEvent_childId_idx" ON "DiaryEvent"("childId");

-- CreateIndex
CREATE INDEX "DiaryEvent_type_idx" ON "DiaryEvent"("type");

-- CreateIndex
CREATE INDEX "DiaryEvent_status_idx" ON "DiaryEvent"("status");

-- CreateIndex
CREATE INDEX "DiaryEvent_createdAt_idx" ON "DiaryEvent"("createdAt");

-- CreateIndex
CREATE INDEX "DiaryEvent_eventDate_idx" ON "DiaryEvent"("eventDate");

-- CreateIndex
CREATE INDEX "DiaryEvent_curriculumEntryId_idx" ON "DiaryEvent"("curriculumEntryId");

-- CreateIndex
CREATE INDEX "Attendance_mantenedoraId_idx" ON "Attendance"("mantenedoraId");

-- CreateIndex
CREATE INDEX "Attendance_unitId_idx" ON "Attendance"("unitId");

-- CreateIndex
CREATE INDEX "Attendance_classroomId_idx" ON "Attendance"("classroomId");

-- CreateIndex
CREATE INDEX "Attendance_childId_idx" ON "Attendance"("childId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_classroomId_childId_date_key" ON "Attendance"("classroomId", "childId", "date");

-- CreateIndex
CREATE INDEX "DietaryRestriction_childId_idx" ON "DietaryRestriction"("childId");

-- CreateIndex
CREATE INDEX "DietaryRestriction_isActive_idx" ON "DietaryRestriction"("isActive");

-- CreateIndex
CREATE INDEX "MaterialRequest_mantenedoraId_idx" ON "MaterialRequest"("mantenedoraId");

-- CreateIndex
CREATE INDEX "MaterialRequest_unitId_idx" ON "MaterialRequest"("unitId");

-- CreateIndex
CREATE INDEX "MaterialRequest_classroomId_idx" ON "MaterialRequest"("classroomId");

-- CreateIndex
CREATE INDEX "MaterialRequest_status_idx" ON "MaterialRequest"("status");

-- CreateIndex
CREATE INDEX "MaterialRequest_requestedDate_idx" ON "MaterialRequest"("requestedDate");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRequest_unitId_code_key" ON "MaterialRequest"("unitId", "code");

-- CreateIndex
CREATE INDEX "StockItem_unitId_idx" ON "StockItem"("unitId");

-- CreateIndex
CREATE INDEX "StockItem_isActive_idx" ON "StockItem"("isActive");

-- CreateIndex
CREATE INDEX "StockItem_quantity_idx" ON "StockItem"("quantity");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_unitId_code_key" ON "StockItem"("unitId", "code");

-- CreateIndex
CREATE INDEX "AuditLog_mantenedoraId_idx" ON "AuditLog"("mantenedoraId");

-- CreateIndex
CREATE INDEX "AuditLog_unitId_idx" ON "AuditLog"("unitId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ReportBase_mantenedoraId_idx" ON "ReportBase"("mantenedoraId");

-- CreateIndex
CREATE INDEX "ReportBase_unitId_idx" ON "ReportBase"("unitId");

-- CreateIndex
CREATE INDEX "ReportBase_classroomId_idx" ON "ReportBase"("classroomId");

-- CreateIndex
CREATE INDEX "ReportBase_childId_idx" ON "ReportBase"("childId");

-- CreateIndex
CREATE INDEX "ReportBase_reportType_idx" ON "ReportBase"("reportType");

-- CreateIndex
CREATE INDEX "ReportBase_startDate_idx" ON "ReportBase"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportBase_unitId_classroomId_childId_reportType_period_sta_key" ON "ReportBase"("unitId", "classroomId", "childId", "reportType", "period", "startDate");

-- CreateIndex
CREATE INDEX "AIContext_mantenedoraId_idx" ON "AIContext"("mantenedoraId");

-- CreateIndex
CREATE INDEX "AIContext_unitId_idx" ON "AIContext"("unitId");

-- CreateIndex
CREATE INDEX "AIContext_childId_idx" ON "AIContext"("childId");

-- CreateIndex
CREATE INDEX "AIContext_type_idx" ON "AIContext"("type");

-- CreateIndex
CREATE INDEX "AIContext_version_idx" ON "AIContext"("version");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleUnitScope" ADD CONSTRAINT "UserRoleUnitScope_userRoleId_fkey" FOREIGN KEY ("userRoleId") REFERENCES "UserRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleUnitScope" ADD CONSTRAINT "UserRoleUnitScope_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomTeacher" ADD CONSTRAINT "ClassroomTeacher_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomTeacher" ADD CONSTRAINT "ClassroomTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumMatrix" ADD CONSTRAINT "CurriculumMatrix_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumMatrixEntry" ADD CONSTRAINT "CurriculumMatrixEntry_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "CurriculumMatrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PlanningTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_curriculumMatrixId_fkey" FOREIGN KEY ("curriculumMatrixId") REFERENCES "CurriculumMatrix"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES "Planning"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_curriculumEntryId_fkey" FOREIGN KEY ("curriculumEntryId") REFERENCES "CurriculumMatrixEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietaryRestriction" ADD CONSTRAINT "DietaryRestriction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBase" ADD CONSTRAINT "ReportBase_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBase" ADD CONSTRAINT "ReportBase_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBase" ADD CONSTRAINT "ReportBase_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBase" ADD CONSTRAINT "ReportBase_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIContext" ADD CONSTRAINT "AIContext_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIContext" ADD CONSTRAINT "AIContext_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIContext" ADD CONSTRAINT "AIContext_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

