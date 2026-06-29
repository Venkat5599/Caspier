#!/usr/bin/env bash
# Seed the self-hosted n8n with Agent Fabric blockchain workflows.
# Uses the n8n CLI import (REST create is buggy in n8n 0.148). Idempotent-ish:
# re-importing updates by id.
set -euo pipefail

CONTAINER="${N8N_CONTAINER:-agentfabric-n8n}"
DIR="$(cd "$(dirname "$0")/n8n-workflows" && pwd)"

# Combine workflow objects into a single array file (n8n CLI expects an array).
python3 - "$DIR" <<'PY'
import json, glob, os, sys
d = sys.argv[1]
wfs = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(d, "*.json"))) if "_all" not in f]
json.dump(wfs, open(os.path.join(d, "_all.json"), "w"))
print(f"combined {len(wfs)} workflows")
PY

docker cp "$DIR/_all.json" "$CONTAINER:/tmp/_all.json"
# Run as the node user with N8N_USER_FOLDER=/home/node so the import writes to
# the SAME database the running n8n process reads (default exec is root → wrong DB).
docker exec -u node -e N8N_USER_FOLDER=/home/node "$CONTAINER" n8n import:workflow --input=/tmp/_all.json
docker restart "$CONTAINER" >/dev/null
docker exec -u node -e N8N_USER_FOLDER=/home/node "$CONTAINER" n8n list:workflow
