#!/usr/bin/env bash
# Seed n8n with Agent Fabric workflows. Works with docker compose or VPS container.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/n8n-workflows" && pwd)"
CONTAINER="${N8N_CONTAINER:-agentfabric-n8n-1}"
COMPOSE_DIR="$(cd "$(dirname "$0")/compose" && pwd)"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Seeding via container ${CONTAINER}..."
else
  echo "Starting n8n via docker compose..."
  (cd "$COMPOSE_DIR" && docker compose up -d n8n)
  sleep 5
  CONTAINER=$(docker ps --format '{{.Names}}' | grep n8n | head -1)
fi

python3 - "$DIR" <<'PY'
import json, glob, os, sys
d = sys.argv[1]
wfs = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(d, "*.json"))) if "_all" not in f]
for wf in wfs:
    wf.setdefault("tags", [])
json.dump(wfs, open(os.path.join(d, "_all.json"), "w"))
print(f"combined {len(wfs)} workflows")
PY

docker cp "$DIR/_all.json" "$CONTAINER:/tmp/_all.json"
docker exec -u node -e N8N_USER_FOLDER=/home/node "$CONTAINER" n8n import:workflow --input=/tmp/_all.json
docker exec -u node -e N8N_USER_FOLDER=/home/node "$CONTAINER" n8n list:workflow
echo "Done. n8n proxy: http://localhost:8089"
