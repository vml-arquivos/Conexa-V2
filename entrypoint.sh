#!/usr/bin/env sh
set -eu

echo "=== Conexa-V2 Entrypoint ==="
echo "Validando variáveis de ambiente obrigatórias..."

# Validar DATABASE_URL (obrigatória)
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL não definida no runtime."
  echo "Configure esta variável no Coolify (Environment Variables)."
  exit 1
fi

echo "✅ Variáveis de ambiente validadas."
echo ""

# Executar migrations (usando DATABASE_URL)
echo "Executando prisma migrate deploy..."

if npx prisma migrate deploy; then
  echo "✅ Migrations aplicadas com sucesso."
else
  echo "❌ ERRO: prisma migrate deploy falhou."
  echo ""
  echo "Possíveis causas:"
  echo "  1. DATABASE_URL incorreta"
  echo "  2. Banco de dados inacessível"
  echo "  3. Limitação do pooler (transaction mode pode falhar em alguns DDL)"
  echo ""
  echo "Consulte: COOLIFY_SETUP_GUIDE.md para troubleshooting"
  echo ""

  # Permitir "best effort" apenas se explicitamente configurado
  if [ "${MIGRATE_BEST_EFFORT:-false}" = "true" ]; then
    echo "⚠️  MIGRATE_BEST_EFFORT=true: Subindo app mesmo assim (NÃO RECOMENDADO EM PRODUÇÃO)"
  else
    echo "Deploy abortado. Configure MIGRATE_BEST_EFFORT=true para subir mesmo com migrations falhando (não recomendado)."
    exit 1
  fi
fi

echo ""
echo "Iniciando aplicação NestJS..."
echo "Path: node /app/dist/src/main.js"
echo ""

exec node /app/dist/src/main.js

