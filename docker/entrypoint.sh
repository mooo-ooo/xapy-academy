#!/bin/sh
set -e

# Apply any pending database migrations before the server starts. Idempotent —
# safe to run on every container start / restart. Requires DATABASE_URL.
echo "[entrypoint] applying prisma migrations (migrate deploy)..."
pnpm prisma migrate deploy

# Optional one-time seed: set SEED_ON_START=true to create the admin + base
# data on first boot. The generated admin password is printed to the logs once.
if [ "${SEED_ON_START}" = "true" ]; then
  echo "[entrypoint] SEED_ON_START=true — running db:seed..."
  pnpm db:seed || echo "[entrypoint] seed skipped/failed (already seeded?)"
fi

echo "[entrypoint] starting: $*"
exec "$@"
