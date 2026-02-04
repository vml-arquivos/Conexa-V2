# syntax=docker/dockerfile:1

############################
# 1) Builder
############################
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run prisma:generate
RUN npm run build

RUN test -f /app/dist/src/main.js


############################
# 2) Runner (runtime)
############################
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl wget dumb-init \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# deps de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

# build + prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# ---------- AQUI ----------
# entrypoint (runtime only)
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
# -------------------------

RUN test -f /app/dist/src/main.js

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/entrypoint.sh"]
