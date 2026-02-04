#!/usr/bin/env sh
set -eu

echo "Running prisma migrate deploy (best effort)..."
npx prisma migrate deploy || echo "WARN: prisma migrate deploy failed, continuing to start the app..."

echo "Starting app..."
exec node dist/src/main.js
