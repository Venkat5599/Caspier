# Deployment architecture

kairos splits the **web UI** (Vercel) from the **execution backend** (VPS). Anyone can publish skills, build workflows, and connect Claude Code once the VPS gateway is live.

## Topology

```
                    ┌─────────────────────────────────────┐
                    │  Vercel                              │
                    │  kairos.vercel.app / kairos.dev    │
                    │  Next.js 16 dashboard + marketing    │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS (browser)
                                   │ NEXT_PUBLIC_GATEWAY_URL
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│  VPS                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐  │
│  │ Caddy TLS   │───▶│ Gateway :8080│───▶│ Postgres (catalog)  │  │
│  │             │    │ x402 + chain │    │ redis, nats, minio  │  │
│  └─────────────┘    └──────────────┘    └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         ▲
         │ HTTPS (GATEWAY_URL)
         │
┌────────┴────────────────────────────────────────┐
│  Developer machine — Claude Code                 │
│  MCP stdio: bun apps/mcp-server/src/index.ts     │
│  Tools: list_skills, get_skill, invoke_skill     │
└──────────────────────────────────────────────────┘
```

## Domains and ports

| Surface | Host | Port | Role |
|---------|------|------|------|
| Web UI | `kairos.vercel.app` / `kairos.dev` | 443 | Marketing, dashboard, publish UI |
| Gateway API | `api.kairos.dev` | 443 → 8080 | Skills catalog, invoke, x402, session keys |
| Postgres | localhost | 5432 | Catalog persistence (not public) |

## Request flows

### Dashboard publish / invoke (browser)

1. User opens `https://kairos.vercel.app/dashboard`.
2. Client-side `fetch` calls `NEXT_PUBLIC_GATEWAY_URL` (e.g. `https://api.kairos.dev/skills`).
3. Gateway validates, stores in Postgres, returns skill metadata.
4. Invoke: `POST /s/:slug` → 402 quote → `POST /s/:slug/auto-pay` → sandbox + on-chain payment.

### Claude Code + MCP (developer machine)

1. Developer clones repo locally.
2. `.mcp.json` runs `bun apps/mcp-server/src/index.ts` with `GATEWAY_URL=https://api.kairos.dev`.
3. MCP tools proxy to the same gateway endpoints as the dashboard.
4. **MCP does not run on the VPS** — stdio transport requires a local process. Streamable HTTP MCP on VPS is a future option.

### Workflows


## Environment variable map

| Where | Variable | Example |
|-------|----------|---------|
| Vercel | `NEXT_PUBLIC_GATEWAY_URL` | `https://api.kairos.dev` |
| VPS `.env` | `GATEWAY_PUBLIC_URL` | `https://api.kairos.dev` |
| VPS `.env` | `GATEWAY_PORT` | `8080` |
| VPS `.env` | `DEPLOY_WEB` | `false` (Vercel hosts UI) |
| Claude Code `.mcp.json` | `GATEWAY_URL` | Same as `NEXT_PUBLIC_GATEWAY_URL` |
| VPS `.env` | `Sepolia_PUBLIC_KEY` | Testnet account for payments |
| VPS `.env` | `CHAIN_WORKER_SECRET_KEY` | Signs transfers |

Full VPS template: `.env.production.example`.

## Deploy order

1. **Vercel** — deploy web with placeholder gateway URL ([VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)).
2. **VPS** — provision Docker, copy `.env.production.example` → `.env`, run `infra/deploy.sh` ([VPS-DEPLOY.md](./VPS-DEPLOY.md)).
4. **Vercel redeploy** — set real `NEXT_PUBLIC_GATEWAY_URL` and redeploy.
5. **Claude Code** — configure MCP per [CLAUDE-CODE-DEMO.md](./CLAUDE-CODE-DEMO.md).

## Security notes

- Gateway CORS is open (`cors()`) so the Vercel origin can call the API. Tighten to `https://kairos.vercel.app` and your custom domain in production if desired.
- Chain worker secret key lives only on the VPS `.env`.
- Session keys scope agent spend; owner key never leaves the VPS.

## Related docs

- [VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md) — frontend on Vercel
- [VPS-DEPLOY.md](./VPS-DEPLOY.md) — backend on VPS
- [CLAUDE-CODE-DEMO.md](./CLAUDE-CODE-DEMO.md) — live demo with Claude Code
