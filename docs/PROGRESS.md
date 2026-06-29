# Agent Fabric — Progress & Handoff

> Living status doc. Read this first when resuming. Last updated: 2026-06-30.

## What this is

**Agent Fabric** — a permissioned execution layer for AI agents on **Casper**.
Publish a `SKILL.md`, get a live, validated, sandboxed, **x402-metered** REST + MCP
endpoint. Agents act through scoped Casper session keys (spend but never drain),
pay per call. Flagship feature: **skills served as endpoints**.

- **Repo:** github.com/Venkat5599/Caspier (`main`)
- **Chain:** Casper (NOT EVM — no Solidity, no Rust contracts). Rail = Casper
  native weighted associated keys + native x402, all TypeScript via `casper-js-sdk`.
- **Concept reference:** github.com/nschwermann/agent_fabric (idea) + blocksec.com (frontend look).
- **Build style:** company/production grade, one brick per commit, tests + CI, push every step.

## Live URLs (VPS)

| What | URL |
|---|---|
| Web (marketplace + dashboard) | http://187.127.137.136:8087 |
| Gateway API | http://187.127.137.136:8086 |
| n8n (via X-Frame proxy) | http://187.127.137.136:8089 |

## VPS

- `root@187.127.137.136`, Ubuntu 24.04, 2 cores / 7.8Gi RAM / 100GB, **4G swap added**.
- SSH key: `~/.ssh/agent_fabric_vps` (ed25519). Password login also on.
- **Shared box** — other unrelated stacks + a host Postgres on :5432 + shared Caddy on :80. Don't touch those.
- Repo deployed at **/opt/agent-fabric**. Secrets in `/opt/agent-fabric/.env` (chmod 600, untracked).
- Hardened: UFW (22/80/443/5678/8086/8087/8089), fail2ban.
- Sandbox decision: **gVisor** (no KVM for Firecracker).

### Containers (compose project `agentfabric`)
- `agentfabric-postgres` (:5433→5432), `-redis`, `-nats`, `-minio` — data plane, bound 127.0.0.1
- `agentfabric-gateway` — `oven/bun:1`, host network, :8086, reads DATABASE_URL + AICREDITS_*
- `agentfabric-web` — Next.js standalone via bun, :8087→3000
- `agentfabric-n8n` — **n8n 0.148.0** (authless, pre-user-management), :5678
- `agentfabric-n8n-proxy` — nginx, :8089, strips X-Frame-Options + hides n8n logo

## Architecture (monorepo, Bun workspaces)

```
apps/web         Next.js 15 + Tailwind + shadcn-style. LIGHT default (BlockSec look),
                 dark toggle. Route groups: (marketing)=landing top-nav, (app)=left-sidebar
                 dashboard (APIs / Create API / MCP Servers / Workflows).
apps/gateway     Hono API. /health, POST/GET /skills, /skills/:slug, POST /workflows/generate.
apps/mcp-server  MCP server (list_skills, get_skill) over @modelcontextprotocol/sdk.
services/catalog CatalogService + stores (InMemory, PgCatalogStore) + migrate + semver.
packages/manifest SKILL.md parser + validator (the unit contract).
packages/{sdk,authz}  scaffold (Casper session-key lib = next).
infra/           docker-compose, Caddyfile, deploy.sh, n8n-proxy/, n8n-workflows/, seed-n8n.sh
docs/            PRD, ARCHITECTURE, ROADMAP, SANDBOX, PROGRESS (this).
```

## DONE (shipped + live + verified)

1. **@fabric/manifest** — SKILL.md parse + validate (15 tests).
2. **@fabric/catalog + @fabric/gateway** — publish→discover loop over HTTP (REST). CORS enabled.
3. **@fabric/mcp-server** — catalog as MCP tools; real stdio handshake verified.
4. **Postgres durability** — PgCatalogStore behind same interface; CI runs a Postgres service.
5. **VPS deploy + hardening** — full stack live on the internet.
6. **CI/CD** — push to `main` → GitHub Actions CI (typecheck+test, Postgres) → auto-deploy over SSH.
7. **Web frontend** — rebuilt to match **blocksec.com** (light corporate SaaS): hero+402 mock,
   pillars, alternating feature rows w/ product mockups, stats, dark CTA, testimonials,
   updates changelog, big footer. Left-sidebar dashboard for app pages.
8. **n8n workflows** — self-hosted, authless, debranded, embedded full-view in /workflows.
   Seeded 3 themed workflows (x402 skill call, Casper rebalance, settle+meter).
9. **AI workflow builder** — chat panel in /workflows → gateway `POST /workflows/generate`
   → **deepseek-v4-flash via aicredits** → themed n8n workflow JSON → created in n8n → opens
   in editor. Verified end to end.

## How to deploy / operate

```bash
# from local: commit + push → CI auto-deploys. If CI SSH times out, deploy manually:
ssh -i ~/.ssh/agent_fabric_vps root@187.127.137.136 "cd /opt/agent-fabric && bash infra/deploy.sh"
# re-run deploy.sh if web build OOMs (it now retries 3x; shared 2-core box is flaky)
# seed n8n workflows: ssh in → bash infra/seed-n8n.sh
```

## Gotchas (learned the hard way)

- **n8n 0.148 REST create needs `tags:[]`** or it 500s (`incomingData.tags.slice()`).
- **n8n CLI import** must run as **node** user with `N8N_USER_FOLDER=/home/node`
  (default `docker exec` is root → writes wrong DB).
- Modern n8n forces owner setup + frame-busts + registers a service worker that
  poisons the browser cache → that's why we pin **0.148** (authless) and use a fresh proxy port.
- **VPS web build is OOM-flaky** (2 cores, many stacks). deploy.sh retries 3x.
- Next.js `/workflows` may briefly 500 right after a web container restart — it's mid-boot, recovers.

## 🔴 SECURITY TODO (do these)

- **Rotate VPS root password** — was pasted in chat earlier.
- **Rotate the aicredits API key** — `sk-live-fbc0…` pasted in chat. New key goes ONLY into
  `/opt/agent-fabric/.env` (`AICREDITS_API_KEY=…`), then restart the gateway. Never commit it.

## NEXT (open bricks, pick up here)

- **Casper wallet sign-in** (CSPR.click) — real "Sign In" instead of the placeholder button.
- **x402 metering brick** — gateway 402 gate → verify Casper x402 proof → execute → usage ledger → settle.
- **Sandbox runtime** — execute a real SKILL.md in gVisor (runtime engine still TBD: llm/code/hybrid).
- **packages/authz** — implement Casper session-key mint / scope / revoke.
- Wire AI-generated workflow HTTP nodes to actually hit live skills; add "my workflows" list in chat.

## Pending decisions

1. Sandbox runtime engine: LLM / deterministic code / hybrid.
2. (Chain settled = Casper. Sandbox settled = gVisor.)
