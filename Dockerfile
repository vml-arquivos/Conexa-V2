# ---- Build stage ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Prisma/openssl (evita warning e runtime quebrado em alguns ambientes)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Dependências (FORÇA devDependencies no build)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Código
COPY . .

# Prisma client + build Nest
RUN npm run prisma:generate
RUN npm run build

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN test -f /app/dist/main.js
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main"]
