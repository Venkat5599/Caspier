# infra

Deployment and operations for the VPS.

- `compose/docker-compose.yml` — data plane (Postgres, Redis, NATS, MinIO).
- `caddy/Caddyfile` — edge reverse proxy with auto-TLS.

## Bring up the data plane
```bash
cp ../.env.example ../.env   # then edit secrets
docker compose -f compose/docker-compose.yml up -d
```

> Scaffold. CI/CD (GitHub Actions), k3s manifests, and sandbox host setup land in Track A — see [../docs/ROADMAP.md](../docs/ROADMAP.md).
