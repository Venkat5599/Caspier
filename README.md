# Agent Fabric

> **Permissioned execution layer for AI agents.** Agents act on paid APIs and on-chain workflows with **scoped session keys** — bounded protocols, assets, methods, and spend — **without ever touching a private key**. Autonomy without custody.
>
> **Flagship feature — Skills as Endpoints:** turn a `SKILL.md` into a live, validated, sandboxed, **x402-metered** REST + MCP endpoint. Humans, apps, and agents call it and **pay per call**.

Built from scratch. Production target, not a demo.

---

## The idea

Autonomous agents are unsafe near money and APIs — they need keys to act, but keys mean unbounded blast radius. Agent Fabric fixes this with a **least-privilege rail on Casper**:

1. **Scoped session keys** — Casper **native weighted associated keys + action thresholds**: the agent gets a low-weight key that can spend but never escalate, remove keys, or drain. No custom contract — it is account-level.
2. **Spend caps & allowlist** — bounded per-call / daily spend, allowed methods, expiry; killable in one transaction.
3. **x402 proxies** — wrap any API as a pay-per-call endpoint settled via Casper **native x402**.
4. **Workflow fabric** — compose x402 calls + on-chain actions + conditionals into reusable, permissionable units.
5. **MCP servers** — expose every unit as an agent-discoverable tool (Claude, ChatGPT, any MCP client).

Everything is **TypeScript-only**, driven through `casper-js-sdk` — no Solidity, no EVM.

On top of the rail sits the headline product: **a `SKILL.md` becomes a metered endpoint** — another permissionable unit, sold per call.

```
SKILL.md ─▶ INGEST ─▶ VALIDATE ─▶ SANDBOX ─▶ METER ─▶ REST route + MCP tool
                                    (isolated)  (x402)   (one skill, two front doors)
```

## Why it matters

- **Publishers** monetize a skill by uploading one Markdown file.
- **Callers / agents** discover and invoke capabilities and pay per use — no integration tax.
- **Account owners** keep custody; the agent gets a low-privilege, revocable key that can spend but never drain or escalate.

## Stack

| Layer | Choice |
|---|---|
| Edge | Caddy (auto-TLS) + API gateway |
| Services | TypeScript on Bun, Hono |
| Chain / auth | Casper native weighted associated keys + action thresholds, via `casper-js-sdk` (no Solidity) |
| Sandbox | gVisor (VPS has no KVM) |
| Data | Postgres · Redis · NATS · MinIO |
| Payments | Casper native x402 |
| MCP | `@modelcontextprotocol/sdk` server |
| Web | Next.js 15 + Tailwind + shadcn/ui |
| Infra | Docker → k3s, GitHub Actions, Vault |
| Observability | Prometheus · Grafana · Loki · Tempo |

## Monorepo layout

```
/apps
  /web              Next.js 15 marketplace + dashboards (shadcn/ui)
  /gateway          API edge: authn, rate-limit, routing
  /mcp-server       MCP gateway — units as agent tools
/services
  /identity         users, orgs, API keys, wallet links
  /catalog          skill/workflow registry, versions, pricing, validation
  /execution        orchestrator + sandbox pool
  /payments         x402 gate, settlement, ledger, payouts
  /chain-worker     the only signer — Casper deploys + x402, transactional outbox
/packages
  /sdk              caller SDK (auto x402 payment)
  /manifest         SKILL.md spec + parser + validator
  /authz            Casper session-key + scope library (weighted keys, caps, revoke)
/infra              compose, caddy, k8s, CI
/docs               PRD, ARCHITECTURE, ROADMAP, SANDBOX
```

## Develop

```bash
bun install
bun run web:dev      # web app
bun run gateway:dev  # API edge (stub)
bun run mcp:dev      # MCP server (stub)
```

## Status

Pivoted from the previous Casper "Bastion" concept to Agent Fabric. Foundation + architecture landed; services scaffolded. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the build sequence and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design.

> Concept inspired by the public agent_fabric project (permissioned execution + x402) and the "skills served as endpoints" model, **rebuilt for Casper** (native weighted keys + native x402, TypeScript-only). All code original.
