#!/usr/bin/env bash
# Kairos — VPS backend deploy. Idempotent: pulls latest, installs, migrates,
# optionally rebuilds web, and (re)starts gateway (+ web when DEPLOY_WEB=true).
# Frontend default: Vercel (set DEPLOY_WEB=false in .env).
set -euo pipefail

APP="${APP_DIR:-/opt/agent-fabric}"
cd "$APP"

echo "==> pull"
git fetch --quiet origin main
git reset --hard --quiet origin/main
echo "    @ $(git rev-parse --short HEAD)"

set -a; . ./.env; set +a

GATEWAY_PORT="${GATEWAY_PORT:-8080}"
WEB_PORT="${WEB_PORT:-8087}"
DEPLOY_WEB="${DEPLOY_WEB:-false}"
GATEWAY_PUBLIC_URL="${GATEWAY_PUBLIC_URL:-http://127.0.0.1:${GATEWAY_PORT}}"
NEXT_PUBLIC_GATEWAY_URL="${NEXT_PUBLIC_GATEWAY_URL:-$GATEWAY_PUBLIC_URL}"

standalone_web_dir() {
  local fixed="$APP/apps/web/.next/standalone/apps/web/server.js"
  if [ -f "$fixed" ]; then
    dirname "$fixed"
    return
  fi
  local found
  found="$(find "$APP/apps/web/.next/standalone" -name server.js -print -quit 2>/dev/null || true)"
  if [ -n "$found" ]; then
    dirname "$found"
    return
  fi
  echo "standalone server.js not found — run web:build first" >&2
  exit 1
}

echo "==> data plane up"
docker compose -p agentfabric --env-file .env -f infra/compose/docker-compose.yml up -d

echo "==> wait for postgres"
for _ in $(seq 1 20); do
  docker exec agentfabric-postgres-1 pg_isready -U fabric >/dev/null 2>&1 && break
  sleep 2
done

echo "==> install + migrate"
docker run --rm --network host -v "$APP":/app -w /app \
  -e DATABASE_URL="$DATABASE_URL" oven/bun:1 bash -lc \
  "bun install --frozen-lockfile || bun install; bun services/catalog/src/migrate.ts"

if [ "$DEPLOY_WEB" = "true" ]; then
  echo "==> build web (retry up to 3x — flaky OOM on the shared box)"
  build_web() {
    docker run --rm -v "$APP":/app -w /app \
      -e NEXT_PUBLIC_GATEWAY_URL="$NEXT_PUBLIC_GATEWAY_URL" \
      -e NODE_OPTIONS="--max-old-space-size=2048" \
      oven/bun:1 bash -lc \
      "rm -rf apps/web/.next; bun run web:build"
    local web_dir
    web_dir="$(standalone_web_dir)"
    cp -r "$APP/apps/web/public" "$web_dir/public" 2>/dev/null || true
    mkdir -p "$web_dir/.next"
    cp -r "$APP/apps/web/.next/static" "$web_dir/.next/static"
  }
  n=0; until build_web; do n=$((n+1)); [ "$n" -ge 3 ] && { echo "web build failed after 3 tries"; exit 1; }; echo "  retry $n…"; sleep 5; done
  WEB_STANDALONE="$(standalone_web_dir)"
  echo "    standalone @ ${WEB_STANDALONE#$APP/}"
else
  echo "==> skip web build (DEPLOY_WEB=false — frontend on Vercel)"
fi

echo "==> (re)start gateway"
docker rm -f agentfabric-gateway >/dev/null 2>&1 || true
docker run -d --name agentfabric-gateway --restart unless-stopped --network host \
  -v "$APP":/app -w /app \
  --env-file .env \
  -e GATEWAY_PORT="$GATEWAY_PORT" \
  -e LOG_LEVEL=info \
  -e GATEWAY_PUBLIC_URL="$GATEWAY_PUBLIC_URL" \
  -e N8N_REST_URL="${N8N_REST_URL:-http://127.0.0.1:5678}" \
  oven/bun:1 bash -lc "bun apps/gateway/src/index.ts" >/dev/null

if [ "$DEPLOY_WEB" = "true" ]; then
  echo "==> (re)start web (Next.js standalone)"
  docker rm -f agentfabric-web >/dev/null 2>&1 || true
  docker run -d --name agentfabric-web --restart unless-stopped \
    -p "${WEB_PORT}:3000" \
    -e PORT=3000 -e HOSTNAME=0.0.0.0 \
    -v "$APP":/app -w "$WEB_STANDALONE" \
    oven/bun:1 bash -lc "bun server.js" >/dev/null
else
  docker rm -f agentfabric-web >/dev/null 2>&1 || true
fi

if command -v caddy >/dev/null 2>&1 && [ -f "$APP/infra/caddy/Caddyfile" ]; then
  echo "==> reload caddy (if systemd unit exists)"
  systemctl reload caddy 2>/dev/null || echo "    (no caddy systemd unit — start manually)"
fi

sleep 4
echo "==> health"
curl -fsS "localhost:${GATEWAY_PORT}/health" && echo
if [ "$DEPLOY_WEB" = "true" ]; then
  curl -fsS -o /dev/null -w "web HTTP %{http_code}\n" "localhost:${WEB_PORT}/" || echo "web health check failed"
fi
echo "==> done"
