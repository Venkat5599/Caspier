# Kairos

> **Permissioned execution for autonomous AI agents on Sepolia.**
> Scoped session keys the agent cannot drain — settling metered API calls through **native Sepolia x402**.

Built from scratch. Production target, not a demo.

---

## Project Overview

**Kairos** lets an AI agent call paid APIs and on-chain workflows **without holding your private key** and **without unbounded blast radius**. The agent spends under a scoped, revocable session key (Sepolia MetaMask-sponsored session EOAs + action thresholds), and every skill call can settle via **native x402** on Sepolia testnet — or the in-memory demo chain when `FABRIC_DEMO_CHAIN=true`.

### What It Does

- **Autonomy without custody** — delegate a low-weight session key; agent can spend within cap, never escalate or drain
- **Skills as endpoints** — upload `SKILL.md`, get a validated, sandboxed, x402-metered REST + MCP endpoint
- **x402 proxies** — wrap any API as pay-per-call; gateway verifies Sepolia transfer proofs
- **Workflow fabric** — compose x402 calls, on-chain actions, and conditionals (n8n integration)
- **MCP gateway** — every unit discoverable as an agent tool

### Key Innovation

```
Raw key on Sepolia:     Agent → Account → Ledger   (drainable, full visibility)
With Kairos:           Agent → Session Key → x402 → Ledger
                       (can't drain · scoped · metered per call)
```

On a transparent ledger, handing an agent a raw key means unbounded risk. Kairos fixes this with **account-level scoped keys** and **per-call x402 metering** — all TypeScript, `ethers` + JSON-RPC, no EVM.

---

## Deployment Information

### Sepolia Testnet

| Setting | Value |
|---------|-------|
| Network | Sepolia testnet |
| RPC | `https://ethereum-sepolia-rpc.publicnode.com` |
| Node | `(JSON-RPC via Sepolia public endpoint)` |
| Chain name | `sepolia` |
| Explorer | `https://sepolia.etherscan.io/tx/` |

Copy `.env.example` to `.env`. With no `CHAIN_WORKER_SECRET_KEY`, `FABRIC_DEMO_CHAIN` auto-enables the demo chain.

### Production deploy (split)

| Surface | Host | Guide |
|---------|------|-------|
| Web UI | Vercel | [docs/VERCEL-DEPLOY.md](./docs/VERCEL-DEPLOY.md) |
| Gateway + backend | VPS | [docs/VPS-DEPLOY.md](./docs/VPS-DEPLOY.md) |
| MCP (Claude Code) | Local machine → VPS gateway | [docs/CLAUDE-CODE-DEMO.md](./docs/CLAUDE-CODE-DEMO.md) |

Set `NEXT_PUBLIC_GATEWAY_URL=https://user-vps-api-domain` on Vercel before deploy. Overview: [docs/DEPLOYMENT-ARCHITECTURE.md](./docs/DEPLOYMENT-ARCHITECTURE.md).

### Develop locally

```bash
bun install
bun run web:dev          # Next.js dashboard + marketing
bun run gateway:dev      # API edge (x402, invoke, session keys)
bun run mcp:dev          # MCP server (alias: agent:serve)
bun run agent:provision  # mint scoped session key (demo registry)
bun run flow             # chain status; add --pay for demo transfer
bun run test
bun run typecheck
bun run build            # typecheck + web build
```

---

## How to Use

### Invoke a metered skill (SDK)

```typescript
import { FabricClient } from "@fabric/sdk";

const client = new FabricClient({
  baseUrl: "http://localhost:8080",
  autoPay: true, // gateway settles via chain worker / demo chain
});

const result = await client.invoke("my-skill", { query: "hello" });
```

### Pay on Sepolia directly (on-chain engine)

```typescript
import { payThroughSession } from "@fabric/evm-chain/onchain";

await payThroughSession({
  recipientPublicKeyHex: "01...",
  amountWei: "1000000000",
  onStep: (s) => console.log(s),
});
```

### CLI

```bash
bun run agent:provision [agentPubKeyHex] [maxSpendWei] [expiresAtISO]
bun run flow --pay
bun run scripts/agent-invoke.ts my-skill http://localhost:8080
```

---

## Architecture

```
Owner (custody)
    │
    ▼
Scoped session key (Sepolia MetaMask-sponsored session EOAs)
    │
    ▼
API Gateway ── x402 quote ── Chain worker / demo chain
    │
    ├── REST /s/:slug
    ├── MCP tools
    └── n8n workflows
```

See [`FABRIC.md`](./FABRIC.md) for the full architecture deep-dive and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for enterprise design.

---

## Project Structure

```
agent-fabric/
├── apps/
│   ├── web/              # Next.js dashboard (kagezks frontend/ equivalent)
│   ├── gateway/          # API edge: authn, x402, routing, invoke
│   └── mcp-server/       # MCP gateway (kagezks agent/mcp-server equivalent)
├── packages/
│   ├── Sepolia/           # On-chain engine (kagezks sdk/ equivalent)
│   ├── sdk/              # Caller SDK + invoke helpers
│   ├── fabric-core/      # Workflow engine + MCP tool registry (kagezks agent/fabric)
│   ├── authz/            # Session key scope library
│   └── manifest/         # SKILL.md parser + validator
├── services/
│   ├── chain-worker/     # Signing service entry (re-exports @fabric/evm-chain)
│   ├── catalog/          # Skill/workflow registry
│   ├── execution/        # Sandbox orchestrator
│   ├── payments/         # x402 gate + ledger
│   └── identity/         # Users, orgs, API keys
├── scripts/              # provision, flow, agent-invoke CLIs
├── infra/                # Docker compose, Caddy, k8s
└── docs/                 # PRD, roadmap, sandbox
```

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Chain | Sepolia (native transfers, weighted keys, x402) |
| Runtime | Bun, TypeScript, Hono |
| Edge | Caddy + API gateway |
| MCP | `@modelcontextprotocol/sdk` |
| Web | Next.js 15 + Tailwind |
| Workflows | n8n |
| Data | Postgres, Redis, NATS |

---

## Status

Foundation + gateway/MCP/x402 path working. Session keys use demo registry until `vault registerAgent (session EOA)` is wired. See [`docs/ROADMAP.md`](./docs/ROADMAP.md).

> Concept inspired by [kagezks](https://github.com/Venkat5599/kagezks) (scoped agent payments + ZK on Stellar) and the public agent_fabric model — **rebuilt for Sepolia** (native keys + native x402, TypeScript-only). All code original.
