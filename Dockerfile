# syntax=docker/dockerfile:1

# =========================
# Builder (devDeps + prisma generate + build + prune)
# =========================
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV CI=true

# Prisma em Debian slim pode precisar do binário openssl para detecção
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

RUN npx prisma generate
RUN npm run build

# IMPORTANTÍSSIMO:
# Remove devDependencies, mas mantém o Prisma Client gerado dentro do node_modules
RUN npm prune --omit=dev


# =========================
# Runner (prod runtime + healthcheck tools + node_modules vindo do builder)
# =========================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Coolify healthcheck usa wget (no seu log): instalar wget.
# Também manter curl + openssl/ca-certs para TLS e Prisma.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends wget curl openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copia o node_modules já "podado" do builder (contém Prisma Client gerado)
COPY --from=builder /app/node_modules ./node_modules

# Copia artefatos e metadados do app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json package-lock.json ./

COPY entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 3000
CMD ["./entrypoint.sh"]
