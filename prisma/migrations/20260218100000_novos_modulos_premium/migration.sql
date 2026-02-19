-- Migration: novos_modulos_premium
-- Criada em: 2026-02-18
-- Adiciona 13 novos modelos e 9 novos enums para os módulos premium:
-- Arquivo, CoordenacaoReuniao, CoordenacaoParticipante, CoordenacaoAta,
-- Formacao, AtendimentoPais, RelatorioFoto, RDIXTemplate, RDIXInstancia,
-- AlertaOperacional, Notificacao, TemplateOffline, SyncMutation

-- CreateEnum
CREATE TYPE "ArquivoEntidade" AS ENUM ('COORDENACAO_REUNIAO', 'COORDENACAO_ATA', 'FORMACAO', 'ATENDIMENTO_PAIS', 'RELATORIO_FOTO', 'DIARIO', 'PLANEJAMENTO', 'RDIX_INSTANCIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoCoordenacao" AS ENUM ('UNIDADE', 'REDE', 'FORMACAO', 'EMERGENCIAL');

-- CreateEnum
CREATE TYPE "StatusCoordenacao" AS ENUM ('RASCUNHO', 'AGENDADA', 'REALIZADA', 'CANCELADA', 'PUBLICADA');

-- CreateEnum
CREATE TYPE "StatusAtendimento" AS ENUM ('AGENDADO', 'REALIZADO', 'CANCELADO', 'PENDENTE_RETORNO');

-- CreateEnum
CREATE TYPE "TipoAtendimento" AS ENUM ('PRESENCIAL', 'REMOTO', 'TELEFONEMA', 'MENSAGEM');

-- CreateEnum
CREATE TYPE "StatusRDIX" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'FINALIZADO', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('FALTA_CONSECUTIVA', 'AUSENCIA_REGISTRO_DIARIO', 'PLANEJAMENTO_PENDENTE', 'RELATORIO_PENDENTE', 'RDIX_PENDENTE', 'MATERIAL_PENDENTE', 'ATENDIMENTO_PENDENTE', 'INCONSISTENCIA_DADOS', 'OUTRO');

-- CreateEnum
CREATE TYPE "SeveridadeAlerta" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "StatusSync" AS ENUM ('PENDENTE', 'PROCESSADO', 'ERRO', 'IGNORADO');

-- CreateTable: Arquivo
CREATE TABLE "Arquivo" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT,
    "entidade" "ArquivoEntidade" NOT NULL,
    "entidadeId" VARCHAR(255) NOT NULL,
    "nomeOriginal" VARCHAR(255) NOT NULL,
    "nomeArquivo" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "caminho" VARCHAR(500) NOT NULL,
    "uploadadoPorId" VARCHAR(255) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CoordenacaoReuniao
CREATE TABLE "CoordenacaoReuniao" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT,
    "tipo" "TipoCoordenacao" NOT NULL,
    "status" "StatusCoordenacao" NOT NULL DEFAULT 'RASCUNHO',
    "titulo" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "dataRealizacao" TIMESTAMP(3) NOT NULL,
    "localOuLink" VARCHAR(500),
    "criadoPorId" VARCHAR(255) NOT NULL,
    "publicadaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CoordenacaoReuniao_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CoordenacaoParticipante
CREATE TABLE "CoordenacaoParticipante" (
    "id" TEXT NOT NULL,
    "reuniaoId" TEXT NOT NULL,
    "usuarioId" VARCHAR(255) NOT NULL,
    "nomeExterno" VARCHAR(255),
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoordenacaoParticipante_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CoordenacaoAta
CREATE TABLE "CoordenacaoAta" (
    "id" TEXT NOT NULL,
    "reuniaoId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "pautaJson" JSONB,
    "encaminhamentosJson" JSONB,
    "redigidoPorId" VARCHAR(255) NOT NULL,
    "aprovadaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CoordenacaoAta_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Formacao
CREATE TABLE "Formacao" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT,
    "titulo" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "ministrante" VARCHAR(255),
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "cargaHoraria" DOUBLE PRECISION,
    "modalidade" VARCHAR(50) NOT NULL,
    "criadoPorId" VARCHAR(255) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Formacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AtendimentoPais
CREATE TABLE "AtendimentoPais" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "responsavelNome" VARCHAR(255) NOT NULL,
    "responsavelRelacao" VARCHAR(100),
    "responsavelContato" VARCHAR(255),
    "tipo" "TipoAtendimento" NOT NULL,
    "status" "StatusAtendimento" NOT NULL DEFAULT 'AGENDADO',
    "dataAtendimento" TIMESTAMP(3) NOT NULL,
    "atendidoPorId" VARCHAR(255) NOT NULL,
    "assunto" VARCHAR(500) NOT NULL,
    "descricao" TEXT,
    "encaminhamento" TEXT,
    "retornoNecessario" BOOLEAN NOT NULL DEFAULT false,
    "dataRetorno" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AtendimentoPais_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RelatorioFoto
CREATE TABLE "RelatorioFoto" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "dataAtividade" TIMESTAMP(3) NOT NULL,
    "criadoPorId" VARCHAR(255) NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "publicadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RelatorioFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RDIXTemplate
CREATE TABLE "RDIXTemplate" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "segmento" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "estruturaJson" JSONB NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" VARCHAR(255) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RDIXTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RDIXInstancia
CREATE TABLE "RDIXInstancia" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "periodo" VARCHAR(50) NOT NULL,
    "anoLetivo" INTEGER NOT NULL,
    "status" "StatusRDIX" NOT NULL DEFAULT 'RASCUNHO',
    "rascunhoJson" JSONB,
    "conteudoFinal" JSONB,
    "criadoPorId" VARCHAR(255) NOT NULL,
    "revisadoPorId" VARCHAR(255),
    "finalizadoEm" TIMESTAMP(3),
    "publicadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RDIXInstancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AlertaOperacional
CREATE TABLE "AlertaOperacional" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT,
    "classroomId" TEXT,
    "childId" TEXT,
    "tipo" "TipoAlerta" NOT NULL,
    "severidade" "SeveridadeAlerta" NOT NULL DEFAULT 'MEDIA',
    "titulo" VARCHAR(255) NOT NULL,
    "descricao" TEXT NOT NULL,
    "metadados" JSONB,
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "resolvidoPorId" VARCHAR(255),
    "resolvidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertaOperacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notificacao
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "usuarioId" VARCHAR(255) NOT NULL,
    "alertaId" TEXT,
    "titulo" VARCHAR(255) NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidaEm" TIMESTAMP(3),
    "link" VARCHAR(500),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TemplateOffline
CREATE TABLE "TemplateOffline" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "segmento" VARCHAR(50) NOT NULL,
    "semana" INTEGER,
    "titulo" VARCHAR(255) NOT NULL,
    "campoExperiencia" VARCHAR(255),
    "objetivoBNCC" TEXT,
    "objetivoCurriculo" TEXT,
    "descricaoAtividade" TEXT,
    "materiaisNecessarios" JSONB,
    "duracaoMinutos" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" VARCHAR(255) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TemplateOffline_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SyncMutation
CREATE TABLE "SyncMutation" (
    "id" TEXT NOT NULL,
    "clienteId" VARCHAR(255) NOT NULL,
    "usuarioId" VARCHAR(255) NOT NULL,
    "operacao" VARCHAR(100) NOT NULL,
    "entidade" VARCHAR(100) NOT NULL,
    "entidadeId" VARCHAR(255),
    "payload" JSONB NOT NULL,
    "status" "StatusSync" NOT NULL DEFAULT 'PENDENTE',
    "erroMsg" TEXT,
    "processadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncMutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Arquivo_mantenedoraId_idx" ON "Arquivo"("mantenedoraId");
CREATE INDEX "Arquivo_entidade_entidadeId_idx" ON "Arquivo"("entidade", "entidadeId");
CREATE INDEX "Arquivo_uploadadoPorId_idx" ON "Arquivo"("uploadadoPorId");

CREATE INDEX "CoordenacaoReuniao_mantenedoraId_idx" ON "CoordenacaoReuniao"("mantenedoraId");
CREATE INDEX "CoordenacaoReuniao_unitId_idx" ON "CoordenacaoReuniao"("unitId");
CREATE INDEX "CoordenacaoReuniao_tipo_idx" ON "CoordenacaoReuniao"("tipo");
CREATE INDEX "CoordenacaoReuniao_status_idx" ON "CoordenacaoReuniao"("status");
CREATE INDEX "CoordenacaoReuniao_dataRealizacao_idx" ON "CoordenacaoReuniao"("dataRealizacao");

CREATE UNIQUE INDEX "CoordenacaoParticipante_reuniaoId_usuarioId_key" ON "CoordenacaoParticipante"("reuniaoId", "usuarioId");
CREATE INDEX "CoordenacaoParticipante_reuniaoId_idx" ON "CoordenacaoParticipante"("reuniaoId");
CREATE INDEX "CoordenacaoParticipante_usuarioId_idx" ON "CoordenacaoParticipante"("usuarioId");

CREATE INDEX "CoordenacaoAta_reuniaoId_idx" ON "CoordenacaoAta"("reuniaoId");

CREATE INDEX "Formacao_mantenedoraId_idx" ON "Formacao"("mantenedoraId");
CREATE INDEX "Formacao_unitId_idx" ON "Formacao"("unitId");
CREATE INDEX "Formacao_dataInicio_idx" ON "Formacao"("dataInicio");

CREATE INDEX "AtendimentoPais_mantenedoraId_idx" ON "AtendimentoPais"("mantenedoraId");
CREATE INDEX "AtendimentoPais_unitId_idx" ON "AtendimentoPais"("unitId");
CREATE INDEX "AtendimentoPais_childId_idx" ON "AtendimentoPais"("childId");
CREATE INDEX "AtendimentoPais_status_idx" ON "AtendimentoPais"("status");
CREATE INDEX "AtendimentoPais_dataAtendimento_idx" ON "AtendimentoPais"("dataAtendimento");

CREATE INDEX "RelatorioFoto_mantenedoraId_idx" ON "RelatorioFoto"("mantenedoraId");
CREATE INDEX "RelatorioFoto_unitId_idx" ON "RelatorioFoto"("unitId");
CREATE INDEX "RelatorioFoto_classroomId_idx" ON "RelatorioFoto"("classroomId");
CREATE INDEX "RelatorioFoto_dataAtividade_idx" ON "RelatorioFoto"("dataAtividade");

CREATE INDEX "RDIXTemplate_mantenedoraId_idx" ON "RDIXTemplate"("mantenedoraId");
CREATE INDEX "RDIXTemplate_segmento_idx" ON "RDIXTemplate"("segmento");

CREATE UNIQUE INDEX "RDIXInstancia_childId_classroomId_periodo_anoLetivo_key" ON "RDIXInstancia"("childId", "classroomId", "periodo", "anoLetivo");
CREATE INDEX "RDIXInstancia_mantenedoraId_idx" ON "RDIXInstancia"("mantenedoraId");
CREATE INDEX "RDIXInstancia_unitId_idx" ON "RDIXInstancia"("unitId");
CREATE INDEX "RDIXInstancia_classroomId_idx" ON "RDIXInstancia"("classroomId");
CREATE INDEX "RDIXInstancia_status_idx" ON "RDIXInstancia"("status");

CREATE INDEX "AlertaOperacional_mantenedoraId_idx" ON "AlertaOperacional"("mantenedoraId");
CREATE INDEX "AlertaOperacional_unitId_idx" ON "AlertaOperacional"("unitId");
CREATE INDEX "AlertaOperacional_tipo_idx" ON "AlertaOperacional"("tipo");
CREATE INDEX "AlertaOperacional_severidade_idx" ON "AlertaOperacional"("severidade");
CREATE INDEX "AlertaOperacional_resolvido_idx" ON "AlertaOperacional"("resolvido");
CREATE INDEX "AlertaOperacional_criadoEm_idx" ON "AlertaOperacional"("criadoEm");

CREATE INDEX "Notificacao_usuarioId_idx" ON "Notificacao"("usuarioId");
CREATE INDEX "Notificacao_lida_idx" ON "Notificacao"("lida");
CREATE INDEX "Notificacao_criadoEm_idx" ON "Notificacao"("criadoEm");

CREATE INDEX "TemplateOffline_mantenedoraId_idx" ON "TemplateOffline"("mantenedoraId");
CREATE INDEX "TemplateOffline_segmento_idx" ON "TemplateOffline"("segmento");
CREATE INDEX "TemplateOffline_semana_idx" ON "TemplateOffline"("semana");

CREATE UNIQUE INDEX "SyncMutation_clienteId_key" ON "SyncMutation"("clienteId");
CREATE INDEX "SyncMutation_usuarioId_idx" ON "SyncMutation"("usuarioId");
CREATE INDEX "SyncMutation_status_idx" ON "SyncMutation"("status");
CREATE INDEX "SyncMutation_criadoEm_idx" ON "SyncMutation"("criadoEm");

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoordenacaoReuniao" ADD CONSTRAINT "CoordenacaoReuniao_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoordenacaoParticipante" ADD CONSTRAINT "CoordenacaoParticipante_reuniaoId_fkey" FOREIGN KEY ("reuniaoId") REFERENCES "CoordenacaoReuniao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoordenacaoAta" ADD CONSTRAINT "CoordenacaoAta_reuniaoId_fkey" FOREIGN KEY ("reuniaoId") REFERENCES "CoordenacaoReuniao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AtendimentoPais" ADD CONSTRAINT "AtendimentoPais_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AtendimentoPais" ADD CONSTRAINT "AtendimentoPais_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RelatorioFoto" ADD CONSTRAINT "RelatorioFoto_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RDIXTemplate" ADD CONSTRAINT "RDIXTemplate_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RDIXInstancia" ADD CONSTRAINT "RDIXInstancia_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RDIXInstancia" ADD CONSTRAINT "RDIXInstancia_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RDIXTemplate"("id") ON UPDATE CASCADE;

ALTER TABLE "RDIXInstancia" ADD CONSTRAINT "RDIXInstancia_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AlertaOperacional" ADD CONSTRAINT "AlertaOperacional_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "AlertaOperacional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TemplateOffline" ADD CONSTRAINT "TemplateOffline_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;
