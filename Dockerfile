# syntax=docker/dockerfile:1

# =========================
# Builder: instala deps (inclui dev), gera prisma, builda Nest
# =========================
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Evita prompts e melhora consistência
ENV CI=true

# 1) Dependências (inclui devDependencies para existir `nest`)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# 2) Código
COPY . .

# 3) Prisma generate (não precisa de DB)
RUN npx prisma generate

# 4) Build (usa nest via node_modules/.bin)
RUN npm run build


# =========================
# Runner: somente prod deps + artefatos buildados
# =========================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Instala SOMENTE deps de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copia build + prisma (schema/migrations)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Entry point
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

CMD ["./entrypoint.sh"]
