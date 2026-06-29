# Agent Fabric

> **Permissioned execution layer for AI agents.** Agents act on paid APIs and on-chain workflows with **scoped session keys** — bounded protocols, assets, methods, and spend — **without ever touching a private key**. Autonomy without custody.
>
> **Flagship feature — Skills as Endpoints:** turn a `SKILL.md` into a live, validated, sandboxed, **x402-metered** REST + MCP endpoint. Humans, apps, and agents call it and **pay per call**.

Built from scratch. Production target, not a demo.

---

## The idea

Autonomous agents are unsafe near money and APIs — they need keys to act, but keys mean unbounded blast radius. Agent Fabric fixes this with a **least-privilege rail**:

1. **Smart account** — upgrade an EOA to a smart account (ERC-7702 delegation).
2. **Scoped session keys** — cryptographic delegations limited to specific contracts, assets, methods, max value, and expiry.
3. **x402 proxies** — wrap any API as a pay-per-call endpoint with programmatic settlement.
4. **Workflow fabric** — compose x402 calls + on-chain actions + conditionals into reusable, permissionable units.
5. **MCP servers** — expose every unit as an agent-discoverable tool (Claude, ChatGPT, any MCP client).

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
| Contracts | Solidity + Foundry, ERC-7702 |
| Sandbox | Firecracker microVM (KVM) or gVisor (fallback) |
| Data | Postgres · Redis · NATS · MinIO |
| Payments | x402 facilitator on EVM |
| MCP | Express MCP server |
| Web | Next.js / Vite + React + Tailwind |
| Infra | Docker → k3s, GitHub Actions, Vault |
| Observability | Prometheus · Grafana · Loki · Tempo |

## Monorepo layout

```
/apps
  /web              marketplace + dashboards (Vite/React today, Next.js target)
  /gateway          API edge: authn, rate-limit, routing
  /mcp-server       MCP gateway — units as agent tools
/services
  /identity         users, orgs, API keys, wallet links
  /catalog          skill/workflow registry, versions, pricing, validation
  /execution        orchestrator + sandbox pool
  /payments         x402 gate, settlement, ledger, payouts
  /chain-worker     the only signer — ERC-7702 + x402, transactional outbox
/packages
  /sdk              caller SDK (auto x402 payment)
  /manifest         SKILL.md spec + parser + validator
  /authz            session-key + scope library
/contracts          Solidity (ERC-7702 delegation, session keys)
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

> Concept derived from the public agent_fabric project (Cronos x402 permissioned execution) plus the "skills served as endpoints" model. All code original.
