#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL nao definido no runtime (Coolify Environment Variables)."
  exit 1
fi

echo "Executando prisma migrate deploy (best effort)..."
npx prisma migrate deploy || echo "Aviso: prisma migrate deploy falhou (best effort). Subindo app mesmo assim."

echo "Iniciando app usando: /app/dist/src/main.js"
exec node /app/dist/src/main.js
