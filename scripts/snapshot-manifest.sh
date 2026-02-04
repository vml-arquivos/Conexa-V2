#!/bin/bash
# SNAPSHOT MANIFEST - CONEXA V2
# Gera evidências verificáveis do estado do repositório

set -e

echo "================================================================================"
echo "SNAPSHOT MANIFEST - CONEXA V2"
echo "Data: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "================================================================================"
echo ""

# 1. ÁRVORE DO PROJETO
echo "1. ÁRVORE DO PROJETO"
echo "--------------------------------------------------------------------------------"
find . -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/matriz-2026.pdf" \
  -not -path "*/extract-pdf.js" \
  -not -path "*/pdf-sample.txt" \
  -not -path "*/prisma/schema_v1.2_proposed.prisma" \
  | sort
echo ""
echo "Total de arquivos: $(find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" | wc -l)"
echo ""

# 2. CHECKSUMS (SHA256)
echo "2. CHECKSUMS (SHA256)"
echo "--------------------------------------------------------------------------------"
echo "Arquivos críticos:"
echo ""

if [ -f prisma/schema.prisma ]; then
  sha256sum prisma/schema.prisma
fi

if [ -f package.json ]; then
  sha256sum package.json
fi

if [ -f README.md ]; then
  sha256sum README.md
fi

if [ -f .env.example ]; then
  sha256sum .env.example
fi

echo ""
echo "Migrations:"
if [ -d prisma/migrations ]; then
  find prisma/migrations -name "migration.sql" -exec sha256sum {} \;
  sha256sum prisma/migrations/migration_lock.toml 2>/dev/null || echo "migration_lock.toml não encontrado"
else
  echo "Diretório prisma/migrations não encontrado"
fi

echo ""
echo "Módulo curriculum-import:"
if [ -d src/curriculum-import ]; then
  find src/curriculum-import -type f -name "*.ts" -exec sha256sum {} \; | sort
else
  echo "Diretório src/curriculum-import não encontrado"
fi

echo ""

# 3. VERSÕES
echo "3. VERSÕES"
echo "--------------------------------------------------------------------------------"
echo "Node: $(node -v)"
echo "NPM: $(npm -v)"
echo "Prisma: $(npx prisma -v | head -1)"
echo ""

# 4. VALIDAÇÕES PRISMA
echo "4. VALIDAÇÕES PRISMA"
echo "--------------------------------------------------------------------------------"

echo "4.1. Prisma Validate"
echo "---"
npx prisma validate 2>&1 || echo "ERRO: prisma validate falhou"
echo ""

echo "4.2. Prisma Generate"
echo "---"
npx prisma generate 2>&1 || echo "ERRO: prisma generate falhou"
echo ""

# 5. STATUS DO BANCO
echo "5. STATUS DO BANCO"
echo "--------------------------------------------------------------------------------"

if [ -z "$DATABASE_URL" ] && [ -z "$DIRECT_URL" ]; then
  echo "DB_NOT_CONFIGURED"
  echo "DATABASE_URL e DIRECT_URL não estão configurados no ambiente."
  echo "Pulando verificação de migrations no banco."
else
  echo "DATABASE_URL configurado. Verificando status das migrations..."
  npx prisma migrate status 2>&1 || echo "ERRO: prisma migrate status falhou"
fi

echo ""

# 6. ESTRUTURA DE MÓDULOS
echo "6. ESTRUTURA DE MÓDULOS"
echo "--------------------------------------------------------------------------------"
echo "Módulos implementados:"
for dir in src/*/; do
  if [ -d "$dir" ]; then
    module_name=$(basename "$dir")
    file_count=$(find "$dir" -name "*.ts" | wc -l)
    echo "  - $module_name: $file_count arquivos"
  fi
done
echo ""

# 7. RESUMO
echo "7. RESUMO"
echo "--------------------------------------------------------------------------------"
echo "Models Prisma: $(grep -c "^model " prisma/schema.prisma 2>/dev/null || echo 0)"
echo "Enums Prisma: $(grep -c "^enum " prisma/schema.prisma 2>/dev/null || echo 0)"
echo "Migrations: $(find prisma/migrations -name "migration.sql" 2>/dev/null | wc -l)"
echo "Módulos src/: $(find src -maxdepth 1 -type d | tail -n +2 | wc -l)"
echo ""

echo "================================================================================"
echo "SNAPSHOT MANIFEST CONCLUÍDO"
echo "================================================================================"
