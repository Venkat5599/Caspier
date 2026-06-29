#!/usr/bin/env bash
# Seed the self-hosted n8n with Agent Fabric blockchain workflows.
# Idempotent: skips a workflow if one with the same name already exists.
set -euo pipefail

N8N="${N8N_API:-http://127.0.0.1:5678}"
DIR="$(cd "$(dirname "$0")/n8n-workflows" && pwd)"

existing=$(curl -s "$N8N/rest/workflows" | tr ',' '\n' | grep -o '"name":"[^"]*"' || true)

for f in "$DIR"/*.json; do
  name=$(grep -o '"name": *"[^"]*"' "$f" | head -1 | sed 's/.*"name": *"//; s/"$//')
  if echo "$existing" | grep -qF "\"name\":\"$name\""; then
    echo "skip (exists): $name"
    continue
  fi
  code=$(curl -s -o /tmp/n8n_seed_resp -w "%{http_code}" -X POST "$N8N/rest/workflows" \
    -H "Content-Type: application/json" --data-binary @"$f")
  echo "create [$code]: $name"
done
echo "done"
