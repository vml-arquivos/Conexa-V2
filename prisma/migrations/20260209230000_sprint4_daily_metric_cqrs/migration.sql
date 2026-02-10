-- CreateEnum
CREATE TYPE "DailyMetricType" AS ENUM ('DIARY', 'ACCESS');

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "DailyMetricType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyMetric_unitId_date_idx" ON "DailyMetric"("unitId", "date");

-- CreateIndex
CREATE INDEX "DailyMetric_type_date_idx" ON "DailyMetric"("type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_unitId_date_type_key" ON "DailyMetric"("unitId", "date", "type");

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
