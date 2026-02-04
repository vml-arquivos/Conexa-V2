# syntax=docker/dockerfile:1

############################
# 1) Builder (build + prisma generate)
############################
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

# sanity check
RUN test -f /app/dist/src/main.js


############################
# 2) Runner (somente produção)
############################
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl wget dumb-init \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# instala somente dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

# copia build + schema do prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# copia apenas o Prisma Client gerado (sem trazer o node_modules inteiro do builder)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# sanity check
RUN test -f /app/dist/src/main.js

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
