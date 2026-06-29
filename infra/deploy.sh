#!/usr/bin/env bash
# Agent Fabric — VPS deploy. Idempotent: pulls latest, installs, migrates,
# rebuilds the web app, and (re)starts the gateway + web containers.
# Run on the VPS from the repo root, or invoked over SSH by CI.
set -euo pipefail

APP="${APP_DIR:-/opt/agent-fabric}"
cd "$APP"

echo "==> pull"
git fetch --quiet origin main
git reset --hard --quiet origin/main
echo "    @ $(git rev-parse --short HEAD)"

# .env must already exist on the host (created once at provision time).
set -a; . ./.env; set +a

echo "==> data plane up"
docker compose -p agentfabric --env-file .env -f infra/compose/docker-compose.yml up -d

echo "==> wait for postgres"
for _ in $(seq 1 20); do
  docker exec agentfabric-postgres-1 pg_isready -U fabric >/dev/null 2>&1 && break
  sleep 2
done

echo "==> install + migrate + build web (bun container)"
docker run --rm --network host -v "$APP":/app -w /app \
  -e DATABASE_URL="$DATABASE_URL" oven/bun:1 bash -lc \
  "bun install --frozen-lockfile || bun install; bun services/catalog/src/migrate.ts; bun run web:build"

echo "==> (re)start gateway"
docker rm -f agentfabric-gateway >/dev/null 2>&1 || true
docker run -d --name agentfabric-gateway --restart unless-stopped --network host \
  -v "$APP":/app -w /app \
  -e DATABASE_URL="$DATABASE_URL" -e GATEWAY_PORT="${GATEWAY_PORT:-8086}" -e LOG_LEVEL=info \
  oven/bun:1 bash -lc "bun apps/gateway/src/index.ts" >/dev/null

echo "==> (re)start web"
docker rm -f agentfabric-web >/dev/null 2>&1 || true
docker run -d --name agentfabric-web --restart unless-stopped \
  -p "${WEB_PORT:-8087}:80" \
  -v "$APP/apps/web/dist":/usr/share/nginx/html:ro \
  nginx:alpine >/dev/null

sleep 4
echo "==> health"
curl -fsS "localhost:${GATEWAY_PORT:-8086}/health" && echo
echo "==> done"
