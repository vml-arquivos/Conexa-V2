# syntax=docker/dockerfile:1

# =========================
# Builder: deps com dev (para nest), build Nest, prisma generate
# =========================
FROM node:20-bookworm-slim AS builder
WORKDIR /app

ENV CI=true

# Instala deps (inclui devDependencies -> traz @nestjs/cli e o binário `nest`)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copia o código
COPY . .

# Gera client do Prisma (não precisa de DB)
RUN npx prisma generate

# Build (usa `nest build`, encontrado em node_modules/.bin)
RUN npm run build


# =========================
# Runner: apenas prod deps + dist + prisma + entrypoint
# =========================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Instala SOMENTE dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copia artefatos gerados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Copia entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

CMD ["./entrypoint.sh"]
