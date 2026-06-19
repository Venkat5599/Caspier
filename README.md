# Bastion — The Autonomous All-Weather Agent on Casper

> An AI agent that builds and rebalances a **Ray Dalio All-Weather portfolio** of tokenized real-world assets on the **Casper Network**. You trigger a run; the agent autonomously decides what to trade and executes on-chain — non-custodial. It even pays for its own market data via **x402**.

Built for the **Casper Agentic Buildathon 2026** — Casper Innovation Track. Hits all three pillars: **Agentic AI · DeFi · RWA**.

---

## What it is

Bastion is an agent, not a dashboard. You trigger a run (one tap — cheap, no idle compute); the agent then autonomously:

1. **Perceives** — pulls macro (growth, inflation) + prices through a paid endpoint, paying per request via Casper's native **x402** facilitator.
2. **Classifies the regime** — maps growth × inflation to one of four Dalio regimes (Goldilocks / Reflation / Deflation / Stagflation). Real judgment, not fixed weights.
3. **Tilts + decides** — tilts the All-Weather allocation toward the regime, then rebalances only past a threshold band.
4. **Acts** — executes swaps on-chain through the **CSPR.trade** AMM. You always hold your keys.
5. **Stakes reputation** — records the call on its on-chain **Agent Passport**; reputation moves with the outcome. Accountable autonomy.
6. **Reports** — every step emits a Casper Testnet deploy hash you can click.

**Why this isn't a clone:** regime-aware tilting (the AI actually decides) + on-chain reputation staking (accountable autonomy, a primitive other Casper agents can reuse).

## Allocation (All-Weather, tokenized)

| Token | Asset | Weight |
|-------|-------|--------|
| wTLT  | Long-Term Treasuries | 40% |
| wSPX  | Equities (S&P basket) | 30% |
| wIEF  | Intermediate Treasuries | 15% |
| wGLD  | Gold | 7.5% |
| wDBC  | Commodities | 7.5% |

## Why Casper

- **Native x402** — the agent pays for its own data on-chain, per request.
- **Upgradeable contracts** — rebalance strategy updates without migrating funds.
- **CSPR.trade AMM** (live on Testnet) — real swaps, real liquidity.
- **MCP + CSPR.cloud** — the agent reads/streams chain state via the official toolkit.

## Stack

- **Web:** Vite + React + TypeScript + Tailwind v4 + framer-motion
- **Contracts:** Odra (Rust) — CEP-18 wRWA tokens, BasketVault, upgradeable Rebalancer
- **Agent:** Bun + TypeScript perceive→decide→act loop
- **Chain:** Casper MCP server + CSPR.cloud + x402 facilitator + CSPR.click wallet

## Run the web app

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # production build to dist/
```

## Project layout

```
/src           web app (landing + live agent console)
/docs          PRD.md, ARCHITECTURE.md
/contracts     Odra contracts            (in progress)
/agent         Bun agent runtime         (in progress)
/mcp           Casper MCP server         (in progress)
```

## Status

- ✅ Web app + live agent console (demo flow)
- 🚧 Odra contracts → Testnet
- 🚧 Agent runtime wired to chain
- 🚧 x402-paid data feed

## What is real vs mocked (honest)

| Real on Testnet | Mocked / illustrative (labeled in UI) |
|-----------------|----------------------------------------|
| Odra contracts, deploy hashes, CSPR.trade swaps, CSPR.cloud reads, CSPR.click custody | wRWA tokens represent real assets but are **test tokens**; backtest/performance numbers are illustrative; the console flow is simulated until contracts land |

All code original to this Buildathon. Concept inspired by the public All-Weather strategy; no third-party product code or assets reused.

> Testnet demo. Not financial advice.
