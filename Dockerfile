# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV CI=true

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

# Prisma generate (não precisa de DB)
RUN npx prisma generate

# Build Nest
RUN npm run build


FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Pacotes necessários:
# - curl: healthcheck do Coolify
# - openssl + ca-certificates: Prisma/engine e TLS
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends curl openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
CMD ["./entrypoint.sh"]
