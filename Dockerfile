# syntax=docker/dockerfile:1

# -------------------------
# Build stage
# -------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Dependências do sistema (Prisma/SSL)
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Instala deps (inclui devDeps para compilar Nest)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copia código
COPY . .

# Gera Prisma Client e build do Nest
RUN npm run prisma:generate
RUN npm run build


# -------------------------
# Runtime stage
# -------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Ferramentas p/ healthcheck + init correto + SSL
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl dumb-init \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Copia apenas manifests e instala SOMENTE deps de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

# Copia build e prisma (schema)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# (Opcional, mas recomendado) garante que main existe
RUN test -f /app/dist/src/main.js

EXPOSE 3000

# Melhor handling de signals
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/src/main.js"]
