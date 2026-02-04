# ---- Build stage ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Dependências
COPY package.json package-lock.json ./
RUN npm ci

# Código
COPY . .

# Prisma client + build Nest
RUN npm run prisma:generate
RUN npm run build

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar apenas o necessário
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Start
CMD ["node", "dist/main"]
