#!/usr/bin/env sh
set -eu

# Não imprime secrets. Apenas valida presença mínima.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL nao definido no runtime (Coolify Environment Variables)."
  exit 1
fi

echo "Executando prisma migrate deploy (best effort)..."
npx prisma migrate deploy || echo "Aviso: prisma migrate deploy falhou (best effort). Subindo app mesmo assim."

echo "Iniciando app (start:prod)..."
exec node dist/main
