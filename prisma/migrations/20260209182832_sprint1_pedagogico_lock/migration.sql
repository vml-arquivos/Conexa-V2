-- AlterTable
ALTER TABLE "DiaryEvent" ADD COLUMN IF NOT EXISTS "medicaoAlimentar" JSONB,
ADD COLUMN IF NOT EXISTS "sonoMinutos" JSONB,
ADD COLUMN IF NOT EXISTS "trocaFraldaStatus" JSONB;

-- Conexa Guardrail: DiaryEvent curriculumEntryId backfill
-- Objetivo: garantir que nenhum DiaryEvent fique com curriculumEntryId NULL antes do NOT NULL.
-- Estratégia:
-- 1) Preencher via Planning.curriculumMatrixId + match por dia pedagógico (America/Sao_Paulo)
-- 2) Para órfãos com matrixId conhecido, criar CurriculumMatrixEntry "auto-backfill" na própria matriz e apontar o DiaryEvent
-- 3) Se ainda sobrar NULL (sem planning/matrix), abortar migration (seguro, evita quebrar produção)

-- 1) Preencher quando já existe entry na matriz do planning
UPDATE "DiaryEvent" de
SET "curriculumEntryId" = cme.id
FROM "Planning" p
JOIN "CurriculumMatrixEntry" cme
  ON cme."matrixId" = p."curriculumMatrixId"
WHERE de."planningId" = p.id
  AND de."curriculumEntryId" IS NULL
  AND p."curriculumMatrixId" IS NOT NULL
  AND to_char((de."eventDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
      = to_char((cme."date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');

-- 2) Criar entries de auto-backfill (APENAS para os que ainda estão NULL e têm curriculumMatrixId)
-- Observação: usa on conflict (matrixId,date) para ser idempotente.
INSERT INTO "CurriculumMatrixEntry" (
  "id","matrixId","date","weekOfYear","dayOfWeek","campoDeExperiencia",
  "objetivoBNCC","objetivoBNCCCode","objetivoCurriculo","intencionalidade",
  "createdAt","updatedAt"
)
SELECT
  ('AUTO_BACKFILL_' || de.id) AS id,
  p."curriculumMatrixId" AS "matrixId",
  de."eventDate" AS "date",
  COALESCE(EXTRACT(ISOWEEK FROM ((de."eventDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'))::int, 0) AS "weekOfYear",
  COALESCE(EXTRACT(ISODOW  FROM ((de."eventDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'))::int, 1) AS "dayOfWeek",
  'O_EU_O_OUTRO_E_O_NOS'::"CampoDeExperiencia" AS "campoDeExperiencia",
  'AUTO-BACKFILL (DiaryEvent sem entry correspondente)' AS "objetivoBNCC",
  NULL AS "objetivoBNCCCode",
  'AUTO-BACKFILL (DiaryEvent sem entry correspondente)' AS "objetivoCurriculo",
  NULL AS "intencionalidade",
  now() AS "createdAt",
  now() AS "updatedAt"
FROM "DiaryEvent" de
JOIN "Planning" p ON p.id = de."planningId"
WHERE de."curriculumEntryId" IS NULL
  AND p."curriculumMatrixId" IS NOT NULL
ON CONFLICT ("matrixId","date") DO NOTHING;

-- Reapontar DiaryEvent para a entry existente (seja ela criada agora ou já existente por conflito)
UPDATE "DiaryEvent" de
SET "curriculumEntryId" = cme.id
FROM "Planning" p
JOIN "CurriculumMatrixEntry" cme
  ON cme."matrixId" = p."curriculumMatrixId"
WHERE de."planningId" = p.id
  AND de."curriculumEntryId" IS NULL
  AND p."curriculumMatrixId" IS NOT NULL
  AND to_char((de."eventDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
      = to_char((cme."date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');

-- 3) Abort seguro se ainda existir NULL (ex.: eventos antigos sem planningId/matrix)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "DiaryEvent" WHERE "curriculumEntryId" IS NULL) THEN
    RAISE EXCEPTION 'Migration aborted: existem DiaryEvents sem curriculumEntryId e sem matriz/planning suficiente para backfill. Corrigir dados antes do deploy.';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "DiaryEvent" ALTER COLUMN "curriculumEntryId" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumMatrixEntry_objetivoBNCCCode_idx" ON "CurriculumMatrixEntry"("objetivoBNCCCode");
