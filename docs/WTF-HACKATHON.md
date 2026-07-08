# Kairos × iExec Nox — WTF Hackathon Summer Edition

## One-liner

**Private agent payments on Ethereum Sepolia** — scoped session budgets and per-call API settlements through **Nox confidential contracts**, without exposing amounts or spend patterns on-chain.

## Problem (why Nox fits)

Kairos already solves **custody** (agents never hold the owner key) and **metering** (pay-per-call). On a **transparent** chain, every settlement still leaks:

- how much the agent spent
- who was paid
- running totals that deanonymise treasury usage

Institutions and power users won't route agent payroll through that. **Nox adds the missing privacy layer** without rewriting the open x402 + MCP fabric.

## Integration target (hackathon brief)

| Suggested target | Kairos mapping |
|------------------|----------------|
| Wallets (MetaMask) | Owner connects MetaMask on Sepolia; funds confidential agent vault |
| Treasury / payouts | Private agent session budget + hidden per-call debits |
| DeFi composability | Optional: wrap USDC → confidential token for settlements |

We **do not** modify Uniswap/Aave — we **batch/layer** agent settlements through a Nox vault while the public gateway still speaks HTTP/x402/MCP.

## Architecture

```
Owner (MetaMask, Sepolia)
    │
    ▼
KairosAgentVault (Nox confidential contract)
    │  encrypted budget + encrypted per-call cap
    ▼
Gateway (TypeScript) ── x402 quote ── encrypt amount (Nox JS SDK)
    │
    ▼
Agent (MCP / Claude Code) ── private settle ──► vendor API proxy
```

Public on-chain: contract address, function names, agent wallet.  
**Private via Nox:** budget remaining, payment amounts, cumulative spend.

## Deliverables checklist

- [ ] Public GitHub repo (this repo)
- [ ] `feedback.md` for iExec tools
- [ ] README: install, Sepolia deploy, demo flow
- [ ] Confidential contract deployed on **Ethereum Sepolia** (`11155111`)
- [ ] NoxCompute: `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf`
- [ ] Functional dashboard (`apps/web`) + gateway (`apps/gateway`)
- [ ] End-to-end demo **without mock settlement** (real Sepolia txs + Nox handles)
- [ ] Demo video ≤ 4 minutes
- [ ] X post tagging `@iEx_ec` with description, video, repo link

## Build order (MVP)

1. `contracts/` — `KairosAgentVault.sol` (deposit budget, register agent cap, private debit)
2. `packages/nox-chain/` — deploy helpers + encrypt/decrypt via `@iexec-nox/nox-handle-sdk`
3. Gateway — Sepolia verifier replaces Sepolia demo chain for WTF track
4. Web — MetaMask Sepolia, vault fund UI, session provision
5. Record demo: fund vault → publish skill → MCP invoke → private settlement

## What we reuse from Sepolia build

- Fabric dashboard (APIs, MCP, workflows, marketplace)
- SKILL.md catalog + MCP `api__*` / `wf__*` tools
- x402 quote → pay → retry flow (adapt proofs to Nox handles)

## What we replace

- `packages/evm-chain` → `packages/nox-chain` (Sepolia + Nox SDK)
- Sepolia session keys → Nox ACL-scoped encrypted caps
- `FABRIC_DEMO_CHAIN` → real Sepolia + Nox handles only for submission

## Links

- [Nox docs](https://docs.iex.ec/nox-protocol/getting-started/welcome)
- [Nox confidential contracts](https://github.com/iExec-Nox/nox-confidential-contracts)
- [cDeFi wizard](https://cdefi-wizard.iex.ec/)
- [Discord](https://discord.gg/RXYHBJceMe)
