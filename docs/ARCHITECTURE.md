# Bastion — Technical Architecture

Autonomous All-Weather RWA portfolio agent on Casper.

---

## 1. System overview

```
                         ┌──────────────────────────────────────────┐
                         │              USER (browser)               │
                         │   CSPR.click wallet · self-custody keys    │
                         └───────────────┬───────────────────────────┘
                                         │ connect / deposit / withdraw
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  WEB APP (Vite + React + Tailwind)                                         │
│  landing · live agent console · inflation calc · perf chart · portfolio    │
└───────────────┬───────────────────────────────────────┬───────────────────┘
                │ REST/WS                                 │ wallet sign (deploys)
                ▼                                         ▼
┌───────────────────────────────┐          ┌──────────────────────────────────┐
│  AGENT RUNTIME (Node/Bun svc)  │          │   CASPER TESTNET                  │
│  perceive → decide → act loop  │          │                                   │
│                                │  deploys │  ┌────────────────────────────┐  │
│  1. PERCEIVE                   │─────────▶│  │ BasketVault (Odra)         │  │
│     macro + price feed         │          │  │  - holds wRWA tokens       │  │
│     via x402 paid request ─────┼──x402───▶│  │  - per-user balances       │  │
│  2. DECIDE                     │  payment │  │  - self-custody guard      │  │
│     drift vs target weights    │          │  └────────────────────────────┘  │
│     rebalance plan             │          │  ┌────────────────────────────┐  │
│  3. ACT                        │          │  │ Rebalancer (Odra,          │  │
│     submit rebalance deploy ───┼─────────▶│  │   upgradeable)             │  │
│  4. REPORT                     │          │  │  - executes swaps          │  │
│     log + deploy hash          │          │  └────────────────────────────┘  │
└───────────────┬───────────────┘          │  ┌────────────────────────────┐  │
                │ read state / events       │  │ TestPool (mock AMM)        │  │
                ▼                            │  │  - fixed-rate wRWA swaps   │  │
┌───────────────────────────────┐           │  └────────────────────────────┘  │
│  CSPR.cloud  (REST + Streaming)│◀──────────│  ┌────────────────────────────┐  │
│  balances · deploy status · evt│  events   │  │ wRWA tokens (CEP-18 x5)     │  │
└───────────────────────────────┘           │  │  wTLT wSPX wIEF wGLD wDBC   │  │
                ▲                            │  └────────────────────────────┘  │
                │ MCP tool calls             └──────────────────────────────────┘
┌───────────────┴───────────────┐
│  Casper MCP Server             │
│  exposes chain to the LLM as   │
│  callable tools (query/submit) │
└────────────────────────────────┘
```

## 2. Components

### 2.1 Smart contracts (Odra → Casper Testnet)
- **wRWA tokens** — 5 CEP-18 tokens standing in for tokenized RWAs (wTLT, wSPX, wIEF, wGLD, wDBC). Testnet mocks, minted by us. Clearly labeled.
- **BasketVault** — custodies each user's wRWA holdings; tracks per-user balances; enforces self-custody (only the owner key can withdraw; agent can rebalance *within* the vault but cannot withdraw out).
- **Rebalancer** — **upgradeable** contract holding target weights + rebalance logic. Upgradeability is the Casper-native edge: change strategy without migrating funds. Routes swaps through **CSPR.trade** AMM pools.
- ~~TestPool~~ — **dropped.** CSPR.trade is live on Testnet (Uniswap-V2 AMM, Odra). Agent rebalances through real CSPR.trade pools via its MCP server. We seed wRWA/stable pools with test liquidity.

### 2.2 Agent runtime (Bun service)
The autonomous loop. Runs on an interval (and on macro-event triggers).
- **Perceive:** fetch prices + one macro signal through an **x402-gated endpoint** → produces a real on-chain micropayment deploy. Falls back to a logged stub if the facilitator endpoint is unavailable.
- **Decide:** compute current weights from BasketVault state (via CSPR.cloud), measure drift vs target, apply a rebalance threshold (e.g. >5% band) to avoid churn. LLM reasoning step explains the decision in natural language for the console.
- **Act:** if rebalance warranted, build + submit Rebalancer deploys; wait for finality via CSPR.cloud streaming.
- **Report:** append a structured event `{phase, summary, deployHash, ts}` to the activity log the web console renders.

### 2.3 MCP server
Wraps Casper read/write as LLM-callable tools (`get_balances`, `get_price`, `submit_rebalance`, `get_deploy_status`). Lets the agent reasoning layer reach the chain through the standard protocol — the "agentic" interface judges look for.

### 2.4 Web app (Vite + React + Tailwind + framer-motion)
- Landing (conversion): inflation hook, All-Weather credibility, allocation, 25-yr chart, inflation calculator, partners, alpha/beta, CTA.
- **Agent Console** (the differentiator): live perceive→decide→act stream, target vs actual weights, every action linking to `testnet.cspr.live`.
- Wallet: CSPR.click connect, deposit/withdraw.

## 3. Data flow — one agent cycle

1. Timer fires → agent calls x402-gated price endpoint → **payment deploy #1** on Testnet.
2. Agent reads BasketVault balances via CSPR.cloud → computes weights.
3. Drift check: if any asset off target by > band → build rebalance plan.
4. Agent submits Rebalancer deploy(s) through TestPool → **swap deploy #2..n**.
5. CSPR.cloud streaming confirms finality → console updates → log entries with hashes.
6. If no drift → logs "within band, no action" (still a real perceive + decision).

→ Every cycle yields ≥1 on-chain deploy, satisfying the "transaction-producing" requirement.

## 4. Stack

| Layer | Choice | Why |
|---|---|---|
| Contracts | Odra (Rust) | AI Toolkit native; upgradeable; CEP-18 |
| Agent runtime | Bun + TypeScript | per global rules; fast; one service |
| LLM reasoning | Claude (decision narration + plan) | reasoning layer of the agent |
| Chain access | Casper MCP server + CSPR.cloud | official toolkit; reads/streams |
| Payments | Casper native x402 facilitator | agent pays for data on-chain |
| Wallet | CSPR.click | self-custody connect |
| Frontend | Vite + React + Tailwind v4 + framer-motion | fast premium SPA |

## 5. Trust & safety

- **Self-custody:** withdraw authority bound to the user key only. Agent has rebalance-only authority scoped to the vault; it can never move funds out.
- **Bounded autonomy:** rebalance threshold band + max trade size caps prevent runaway churn.
- **Auditability:** every agent action emits a deploy hash; full activity log is public.
- **Upgrade governance:** Rebalancer upgrades gated (multisig/owner) — documented as roadmap for mainnet.

## 6. Build order (30 days)

1. **Week 1** — wRWA CEP-18 tokens + BasketVault deployed to Testnet; web landing shell.
2. **Week 2** — Rebalancer + TestPool; deposit/withdraw via CSPR.click; allocation engine.
3. **Week 3** — Agent runtime loop (perceive/decide/act) + x402 paid call + MCP server; live console wired to CSPR.cloud.
4. **Week 4** — polish landing (inflation calc, perf chart), record demo, README, harden, dry-run judging.

## 7. What is real vs mocked (disclosed)

| Real on Testnet | Mocked (labeled) |
|---|---|
| CEP-18 tokens, BasketVault, Rebalancer, TestPool deploys | RWA tokens represent real assets but are test tokens |
| x402 payment deploy (if facilitator live) | Swap rates via TestPool oracle, not a real market |
| CSPR.cloud reads/streams, deploy hashes | Backtested performance numbers (illustrative) |
| CSPR.click self-custody flow | Macro feed may be a single stubbed source |

## 8. Repo layout (proposed)

```
/contracts        Odra: tokens, BasketVault, Rebalancer, TestPool
/agent            Bun service: perceive/decide/act loop
/mcp              Casper MCP server (tool definitions)
/web              Vite + React landing + agent console
/docs             PRD.md, ARCHITECTURE.md
README.md         setup + "what's mocked"
```
