#!/usr/bin/env sh
set -eu

# Não logar secrets; só validar presença mínima.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL nao definido no runtime (Coolify Environment Variables)."
  exit 1
fi

echo "Executando prisma migrate deploy (best effort)..."
npx prisma migrate deploy || echo "Aviso: prisma migrate deploy falhou (best effort). Subindo app mesmo assim."

# Start determinístico: encontra o main real gerado pelo Nest/tsconfig
MAIN=""
if [ -f "/app/dist/main.js" ]; then
  MAIN="/app/dist/main.js"
elif [ -f "/app/dist/main" ]; then
  MAIN="/app/dist/main"
elif [ -f "/app/dist/src/main.js" ]; then
  MAIN="/app/dist/src/main.js"
elif [ -f "/app/dist/src/main" ]; then
  MAIN="/app/dist/src/main"
fi

if [ -z "$MAIN" ]; then
  echo "ERRO: nao encontrei arquivo main em /app/dist."
  echo "Conteudo de /app/dist:"
  ls -la /app/dist || true
  echo "Arquivos encontrados (maxdepth 4):"
  find /app/dist -maxdepth 4 -type f -print || true
  exit 1
fi

echo "Iniciando app usando: $MAIN"
exec node "$MAIN"
