# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV CI=true

COPY package.json package-lock.json ./
RUN node -v && npm -v
RUN npm ci --include=dev

COPY . .

# Prova determinística de que o nest existe no build-stage:
RUN ls -la node_modules/.bin | head -n 80
RUN test -f node_modules/.bin/nest && node_modules/.bin/nest --version

RUN npx prisma generate
RUN npm run build


FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
CMD ["./entrypoint.sh"]
