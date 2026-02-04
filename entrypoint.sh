#!/usr/bin/env sh
set -eu

# Opcional: valida se ao menos DATABASE_URL existe (sem imprimir)
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL nao definido no runtime."
  exit 1
fi

# Migrações (best effort como definido)
# NUNCA imprime URLs/senhas
echo "Executando prisma migrate deploy (best effort)..."
npx prisma migrate deploy || echo "Aviso: prisma migrate deploy falhou (best effort). Iniciando app mesmo assim."

echo "Iniciando NestJS..."
exec node dist/main.js
