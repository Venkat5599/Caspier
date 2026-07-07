# Agent Fabric — Architecture Deep-Dive

Casper-chain counterpart to [KAGE.md in kagezks](https://github.com/Venkat5599/kagezks/blob/main/KAGE.md). Scoped agent authority + metered settlement, without Stellar Soroban or ZK circuits.

---

## Problem

Autonomous agents need to pay for APIs and trigger on-chain actions. A raw Casper account key gives the agent (or an attacker) **full custody** — drain, key rotation, unbounded spend. Transparent ledger also publishes every counterparty and amount.

## Solution

Two rails, both enforced without custom smart contracts for session scope:

1. **Scoped session keys** — Casper native **weighted associated keys** + **action thresholds**. Owner delegates a low-weight key; agent can only sign allowed deploy types (e.g. transfers up to cap). Revoke by removing the key in one deploy.

2. **x402 metering** — Gateway returns HTTP 402 with a Casper-native quote (recipient, amount in motes, nonce, expiry). Caller pays via chain worker; gateway verifies deploy proof before executing the skill.

Demo mode (`FABRIC_DEMO_CHAIN=true`) uses an in-memory chain so local dev works without funded testnet keys.

---

## End-to-end flow

```
SKILL.md upload
    → manifest validate
    → catalog register + price
    → gateway /s/:slug (REST) + MCP tool

Caller POST /s/:slug
    → 402 x402 quote
    → transfer (casper-client or demo chain)
    → retry with X-Payment-Proof
    → execution sandbox → result
```

Session key flow (production target):

```
Owner casper-client add-associated-key (low weight, transfer-only threshold)
    → agent holds session secret only
    → agent signs transfers within cap / expiry
    → owner revokes via remove-associated-key
```

---

## Package map (kagezks alignment)

| kagezks | Agent Fabric (Casper) |
|---------|----------------------|
| `sdk/kage-onchain.ts` | `packages/casper/src/fabric-onchain.ts` |
| `sdk/kage.ts` | `packages/casper/src/client.ts` + `rpc.ts` |
| `contracts/solvency/` | N/A — native Casper account keys (no Rust contracts yet) |
| `circuits/` | N/A — no ZK shielded pool on Casper v1 |
| `agent/mcp-server.ts` | `apps/mcp-server/` |
| `agent/fabric-server.ts` | `apps/gateway/` |
| `frontend/` | `apps/web/` |
| `scripts/kage-provision-cli.ts` | `scripts/fabric-provision-cli.ts` |
| `scripts/kage-flow.ts` | `scripts/fabric-flow.ts` |

---

## Chain worker

`@fabric/casper` is the single on-chain keystone (like kagezks `sdk/kage-onchain.ts`). `@fabric/chain-worker` re-exports it for services that historically imported the worker package.

- `ChainWorker.transfer()` — real testnet via `casper-client` CLI or demo store
- `ChainWorker.verifyPayment()` — parse `casper:deploy:` / `casper:demo:` proofs
- `payThroughSession()` — high-level pay helper for CLIs and future session-bound signing

---

## Environment

See `.env.example`. Critical vars:

- `CASPER_RPC_URL`, `CASPER_CHAIN_NAME`, `CASPER_NETWORK`
- `CASPER_PUBLIC_KEY`, `CHAIN_WORKER_SECRET_KEY`
- `FABRIC_DEMO_CHAIN` — force demo chain
- `GATEWAY_PUBLIC_URL` — SDK / CLI target

---

## What we deliberately do not port from kagezks

| kagezks feature | Casper status |
|-----------------|---------------|
| ZK shielded pool (Groth16, Circom) | Not implemented — Casper has no BN254 verifier host fn like Soroban |
| Stealth notes (X25519 ECDH) | Not implemented — would need off-chain + optional future contract |
| Soroban SessionAccount `__check_auth` | Replaced by native weighted associated keys |
| USDC on Stellar | CSPR native transfers + x402 |

These are **user decisions** if privacy parity with kagezks is required later.

---

## Honesty ledger

- Testnet / demo chain only unless you configure live keys.
- Session mint CLI records intent in memory; on-chain `add-associated-key` is the production path.
- x402 and demo transfers are real code paths; mainnet deployment is operator responsibility.
