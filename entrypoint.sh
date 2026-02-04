#!/bin/sh
set -e

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

echo "Starting app..."
exec node dist/src/main.js
