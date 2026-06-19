# Bastion — The Autonomous All-Weather Agent on Casper

> An autonomous AI agent that builds and rebalances a **Ray Dalio All-Weather portfolio** of tokenized real-world assets on the **Casper Network** — 24/7, on-chain, fully non-custodial. It even pays for its own market data via **x402**.

Built for the **Casper Agentic Buildathon 2026** — Casper Innovation Track. Hits all three pillars: **Agentic AI · DeFi · RWA**.

---

## What it is

Bastion is an agent, not a dashboard. Each cycle it:

1. **Perceives** — pulls prices + macro signals through a paid endpoint, paying per request via Casper's native **x402** facilitator.
2. **Decides** — measures portfolio drift from the All-Weather target allocation; rebalances only past a threshold band (no churn).
3. **Acts** — executes swaps on-chain through the **CSPR.trade** AMM. You always hold your keys.
4. **Reports** — every action emits a Casper Testnet deploy hash you can click.

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
