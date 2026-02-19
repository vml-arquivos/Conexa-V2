-- Migration: pedido_compra_solicitacao_correcao
-- Criada em: 2026-02-18
-- Adiciona os modelos PedidoCompra, ItemPedidoCompra e SolicitacaoCorrecao
-- com os enums StatusPedidoCompra, StatusSolicitacaoCorrecao e TipoAlvoCorrecao

-- CreateEnum
CREATE TYPE "StatusPedidoCompra" AS ENUM ('RASCUNHO', 'ENVIADO', 'EM_ANALISE', 'APROVADO', 'COMPRADO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusSolicitacaoCorrecao" AS ENUM ('PENDENTE', 'EM_ANALISE', 'RESOLVIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoAlvoCorrecao" AS ENUM ('DIARIO', 'PLANEJAMENTO', 'FREQUENCIA', 'MATRICULA', 'OUTRO');

-- CreateTable
CREATE TABLE "PedidoCompra" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "mesReferencia" VARCHAR(7) NOT NULL,
    "status" "StatusPedidoCompra" NOT NULL DEFAULT 'RASCUNHO',
    "observacoes" TEXT,
    "consolidadoPor" VARCHAR(255),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "enviadoEm" TIMESTAMP(3),
    "entregueEm" TIMESTAMP(3),

    CONSTRAINT "PedidoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedidoCompra" (
    "id" TEXT NOT NULL,
    "pedidoCompraId" TEXT NOT NULL,
    "categoria" "MaterialRequestType" NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "unidadeMedida" VARCHAR(50),
    "custoEstimado" DOUBLE PRECISION,
    "requisicaoIds" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemPedidoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoCorrecao" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "criadoPorId" VARCHAR(255) NOT NULL,
    "responsavelId" VARCHAR(255) NOT NULL,
    "tipoAlvo" "TipoAlvoCorrecao" NOT NULL,
    "alvoId" VARCHAR(255) NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" "StatusSolicitacaoCorrecao" NOT NULL DEFAULT 'PENDENTE',
    "respostaResolucao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "resolvidaEm" TIMESTAMP(3),

    CONSTRAINT "SolicitacaoCorrecao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PedidoCompra_mantenedoraId_idx" ON "PedidoCompra"("mantenedoraId");

-- CreateIndex
CREATE INDEX "PedidoCompra_unitId_idx" ON "PedidoCompra"("unitId");

-- CreateIndex
CREATE INDEX "PedidoCompra_mesReferencia_idx" ON "PedidoCompra"("mesReferencia");

-- CreateIndex
CREATE INDEX "PedidoCompra_status_idx" ON "PedidoCompra"("status");

-- CreateIndex
CREATE INDEX "ItemPedidoCompra_pedidoCompraId_idx" ON "ItemPedidoCompra"("pedidoCompraId");

-- CreateIndex
CREATE INDEX "SolicitacaoCorrecao_mantenedoraId_idx" ON "SolicitacaoCorrecao"("mantenedoraId");

-- CreateIndex
CREATE INDEX "SolicitacaoCorrecao_unitId_idx" ON "SolicitacaoCorrecao"("unitId");

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedidoCompra" ADD CONSTRAINT "ItemPedidoCompra_pedidoCompraId_fkey" FOREIGN KEY ("pedidoCompraId") REFERENCES "PedidoCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCorrecao" ADD CONSTRAINT "SolicitacaoCorrecao_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCorrecao" ADD CONSTRAINT "SolicitacaoCorrecao_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
