#!/usr/bin/env sh
set -eu

echo "=== Conexa-V2 Entrypoint ==="
echo "Validando variáveis de ambiente obrigatórias..."

# Validar DATABASE_URL (obrigatória)
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ ERRO: DATABASE_URL não definida no runtime."
  echo "Configure esta variável no Coolify (Environment Variables)."
  exit 1
fi

# Log seguro (sem senha)
SAFE_DB_URL="$(echo "$DATABASE_URL" | sed -E 's#(postgres(ql)?://[^:]+:)[^@]+#\1***#')"
echo "✅ DATABASE_URL detectada: ${SAFE_DB_URL}"

echo ""
echo "Checando conectividade com o banco (Postgres)..."

# Teste simples: conecta e faz SELECT 1 (melhor diagnóstico do que só falhar migrate)
if npx prisma db execute --stdin <<'SQL' >/dev/null 2>&1; then
SELECT 1;
SQL
  echo "✅ Conexão com o banco OK."
else
  echo "⚠️  Não foi possível validar conexão via prisma db execute."
  echo "   (Isso pode acontecer se o comando não existir nesta versão do Prisma,"
  echo "    mas se existir e falhar, normalmente é credencial/host/porta.)"
fi

echo ""
echo "Executando prisma migrate deploy..."

if npx prisma migrate deploy; then
  echo "✅ Migrations aplicadas com sucesso."
else
  echo "❌ ERRO: prisma migrate deploy falhou."
  echo ""
  echo "Possíveis causas:"
  echo "  1) DATABASE_URL incorreta (usuário/senha/db/host)"
  echo "  2) Banco inacessível (rede/host/porta/pg_hba)"
  echo ""
  echo "Dica rápida (no Postgres container):"
  echo "  psql -U conexa_user -d conexa -h localhost"
  echo ""

  if [ "${MIGRATE_BEST_EFFORT:-false}" = "true" ]; then
    echo "⚠️  MIGRATE_BEST_EFFORT=true: subindo app mesmo assim (NÃO RECOMENDADO EM PRODUÇÃO)."
  else
    echo "Deploy abortado. (Se quiser forçar, configure MIGRATE_BEST_EFFORT=true)"
    exit 1
  fi
fi

echo ""
echo "Iniciando aplicação NestJS..."

# Fail-fast se o arquivo não existir (diagnóstico perfeito)
if [ ! -f /app/dist/src/main.js ]; then
  echo "❌ ERRO: /app/dist/src/main.js não encontrado."
  echo "Conteúdo de /app/dist:"
  ls -la /app/dist || true
  exit 1
fi

echo "✅ Path: node /app/dist/src/main.js"
echo ""

exec node /app/dist/src/main.js
