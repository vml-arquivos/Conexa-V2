#!/usr/bin/env sh
set -eu

echo "=== Conexa-V2 Entrypoint ==="
echo "Validando variáveis de ambiente obrigatórias..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ ERRO: DATABASE_URL não definida no runtime."
  echo "Configure esta variável no Coolify (Environment Variables)."
  exit 1
fi

echo "✅ Variáveis de ambiente validadas."
echo ""

SCHEMA_PATH="prisma/schema.prisma"

echo "Executando prisma migrate deploy..."
if npx prisma migrate deploy --schema="$SCHEMA_PATH"; then
  echo "✅ Migrations aplicadas com sucesso."
else
  echo "❌ ERRO: prisma migrate deploy falhou."
  echo ""
  echo "Possíveis causas:"
  echo "  1. DATABASE_URL incorreta"
  echo "  2. Banco de dados inacessível"
  echo "  3. Permissões insuficientes"
  echo ""
  if [ "${MIGRATE_BEST_EFFORT:-false}" = "true" ]; then
    echo "⚠️  MIGRATE_BEST_EFFORT=true: Subindo app mesmo assim (NÃO RECOMENDADO EM PRODUÇÃO)"
  else
    echo "Deploy abortado. Configure MIGRATE_BEST_EFFORT=true para subir mesmo com migrations falhando (não recomendado)."
    exit 1
  fi
fi

echo ""
echo "Iniciando aplicação NestJS..."

if [ -f /app/dist/src/main.js ]; then
  echo "Path: node /app/dist/src/main.js"
  exec node /app/dist/src/main.js
elif [ -f /app/dist/main.js ]; then
  echo "Path: node /app/dist/main.js"
  exec node /app/dist/main.js
else
  echo "❌ ERRO: não encontrei o entrypoint compilado em /app/dist."
  echo "Conteúdo de /app/dist:"
  ls -la /app/dist || true
  exit 1
fi
