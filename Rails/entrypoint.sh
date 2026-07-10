#!/bin/bash
set -e

mkdir -p /app/tmp/pids /app/log
rm -f /app/tmp/pids/server.pid

# Intentamos la migración si existe el comando (sino, simplemente sigue adelante)
# (command -v acepta UN solo comando; el guard anterior "bundle exec rails" solo
#  chequeaba "bundle" y era engañoso.)
if command -v bundle > /dev/null 2>&1; then
    echo "🗄️ [Entrypoint] Ejecutando migraciones..."
    bundle exec rails db:prepare || echo "⚠️ [Entrypoint] Migración omitida por falta de estructura."
fi

exec "$@"