#!/bin/bash
set -e

mkdir -p /app/tmp/pids /app/log
rm -f /app/tmp/pids/server.pid

# Intentamos la migración si existe el comando (sino, simplemente sigue adelante)
if command -v bundle exec rails &> /dev/null; then
    echo "🗄️ [Entrypoint] Ejecutando migraciones..."
    bundle exec rails db:prepare || echo "⚠️ [Entrypoint] Migración omitida por falta de estructura."
fi

exec "$@"