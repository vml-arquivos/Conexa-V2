# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl wget dumb-init \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run prisma:generate
RUN npm run build


FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl dumb-init \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Copia tudo pronto do builder (inclusive Prisma Client gerado)
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Remove dev deps do node_modules (mantém Prisma Client gerado)
RUN npm prune --omit=dev \
  && npm cache clean --force

RUN test -f /app/dist/src/main.js

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
