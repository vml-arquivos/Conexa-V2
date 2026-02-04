FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl wget dumb-init \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run prisma:generate
RUN npm run build

RUN npm prune --omit=dev && npm cache clean --force
RUN test -f /app/dist/src/main.js

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
