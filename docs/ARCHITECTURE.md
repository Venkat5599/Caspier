# Bastion + Sentinel — Technical Architecture (FINAL)

A regime-aware AI agent (**Bastion**) that acts under a native authorization & kill-switch rail (**Sentinel**) on Casper.

---

## 1. System overview

```
                         ┌──────────────────────────────────────────────┐
                         │                 USER (browser)                │
                         │  CSPR.click wallet · HIGH-weight master key   │
                         │  sets spend caps · can revoke agent in 1 tx   │
                         └───────────────┬──────────────────────────────┘
                                         │ deposit · grant agent key · set policy · REVOKE
                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  WEB APP (Vite + React)  landing · live agent console · caps · kill switch   │
└───────────────┬───────────────────────────────────────────┬──────────────────┘
                │                                             │ wallet sign
                ▼                                             ▼
┌──────────────────────────────┐               ┌──────────────────────────────────┐
│  BASTION agent (Bun)         │   deploys     │   CASPER TESTNET                  │
│  perceive→regime→decide→act  │  (signed by   │                                   │
│                              │   LOW-weight  │  ┌─────────────────────────────┐ │
│  1 PERCEIVE  x402 paid data ─┼───agent key)─▶│  │ SENTINEL policy (Odra,      │ │
│  2 REGIME    classify+tilt   │               │  │   upgradeable)              │ │
│  3 DECIDE    drift vs target │               │  │  - per-tx + daily caps      │ │
│  4 ACT       swap            │   every tx    │  │  - contract/method allowlist│ │
│              ▲               │   checked     │  │  - rate limit · spend ledger│ │
└──────────────┼───────────────┘   against    │  └─────────────────────────────┘ │
               │ reads/streams      policy     │  ┌─────────────────────────────┐ │
               ▼                                │  │ USER ACCOUNT (native keys)  │ │
┌──────────────────────────────┐               │  │  master key  weight 3       │ │
│  CSPR.cloud (REST + Stream)   │◀──────────────│  │  agent key   weight 1       │ │
│  balances · deploys · events  │   events      │  │  deploy thr 1 · keymgmt 3   │ │
└──────────────────────────────┘               │  └─────────────────────────────┘ │
               ▲                                │  ┌─────────────────────────────┐ │
               │ MCP tool calls                 │  │ BasketVault (Odra)          │ │
┌──────────────┴───────────────┐               │  │  holds wRWA · self-custody  │ │
│  Casper MCP + CSPR.trade MCP  │               │  └─────────────────────────────┘ │
└───────────────────────────────┘              │  ┌─────────────────────────────┐ │
                                                │  │ CSPR.trade AMM (live)       │ │
                                                │  │  real wRWA swaps            │ │
                                                │  └─────────────────────────────┘ │
                                                │  ┌─────────────────────────────┐ │
                                                │  │ wRWA CEP-18 ×5              │ │
                                                │  └─────────────────────────────┘ │
                                                └──────────────────────────────────┘
```

## 2. The Sentinel model (the Casper-unique core)

Casper accounts natively support **associated keys with weights** and **action thresholds**:

- `deploy` threshold — weight needed to send spending transactions.
- `key_management` threshold — weight needed to add/remove keys or change weights.

Sentinel configures the user account as:

| Key | Weight | Can spend? | Can manage keys? |
|-----|--------|-----------|------------------|
| Master (user) | 3 | yes | yes |
| Agent (Bastion) | 1 | yes (≥ deploy thr 1) | **no** (< keymgmt thr 3) |

So the agent can trade but can **never** escalate, remove keys, or drain. On top, the **Sentinel policy contract** (upgradeable) enforces *what* and *how much*: per-tx cap, daily cap, allowlist (only CSPR.trade + x402 facilitator), rate limit, and a spend ledger. **Revocation** = master key removes the agent key in one deploy → instant on-chain death, no orphaned children.

> No other major L1 has weighted associated keys + action thresholds at the account level. This is what makes Sentinel native to Casper and not portable.

## 3. Components

### 3.1 Contracts (Odra → Testnet)
- **wRWA tokens** — CEP-18 ×5 (wTLT, wSPX, wIEF, wGLD, wDBC), Testnet mocks.
- **BasketVault** — custodies user wRWA; self-custody (only master key withdraws).
- **Rebalancer** — upgradeable; base weights + regime-tilt + executes swaps via CSPR.trade.
- **Sentinel policy** — upgradeable; caps, allowlist, rate limit, spend ledger; every agent tx validates against it.

### 3.2 Bastion agent (Bun)
On user-triggered run: **perceive** (x402 paid macro/price) → **classify regime** (growth × inflation → Dalio quadrant; LLM justifies) → **tilt + decide** (drift vs tilted targets) → **act** (CSPR.trade swaps, signed by low-weight agent key, each checked by Sentinel). No idle cron — runs on request.

### 3.3 MCP servers
Casper MCP + CSPR.trade MCP expose chain read/write + swaps as LLM-callable tools.

### 3.4 Web app
Landing (inflation hook, allocation, 25-yr chart, calculator) + **agent console** (regime, tilt, reputation, live log) + **Sentinel panel** (caps, spend ledger, revoke button). CSPR.click connect.

## 4. One agent run (data flow)
1. User taps Run → agent calls x402 endpoint → **payment deploy** (checked by Sentinel allowlist + cap).
2. Reads BasketVault via CSPR.cloud → classifies regime → tilts targets.
3. Drift > band → builds rebalance plan.
4. Submits CSPR.trade swap deploys, signed by **agent key** → each validated by Sentinel policy (cap/allowlist/rate). Over-cap → **rejected on-chain**.
5. CSPR.cloud streaming confirms → console + spend ledger update with hashes.
→ ≥1 on-chain deploy per run (eligibility met).

**Kill demo:** user taps Revoke → master key removes agent key → agent's next deploy **fails on-chain** (insufficient weight).

## 5. Stack
| Layer | Choice |
|---|---|
| Contracts | Odra (Rust) — CEP-18, BasketVault, Rebalancer, Sentinel policy |
| Agent | Bun + TypeScript; LLM (Claude) for regime reasoning |
| Chain access | Casper MCP + CSPR.trade MCP + CSPR.cloud |
| Payments | native x402 facilitator (capped by Sentinel) |
| Auth model | native weighted associated keys + action thresholds |
| Wallet | CSPR.click |
| Frontend | Vite + React + Tailwind v4 + framer-motion |

## 6. Build order (30 days)
1. **Wk1** — wRWA CEP-18 + BasketVault on Testnet; web landing (done).
2. **Wk2** — Sentinel policy contract + weighted-key setup + revoke flow; CSPR.click connect; deposit/withdraw.
3. **Wk3** — Bastion agent loop (perceive/regime/decide/act) + x402 + CSPR.trade swaps under Sentinel; console wired to CSPR.cloud.
4. **Wk4** — Sentinel panel (caps, ledger, kill), polish, record demo (incl. cap-block + kill), README, dry-run.

## 7. Real vs mocked (disclosed)
| Real on Testnet | Mocked / illustrative |
|---|---|
| Sentinel weighted keys + policy, BasketVault, CSPR.trade swaps, x402 payment, revocation deploys, CSPR.cloud reads, CSPR.click custody | wRWA = test tokens; backtest numbers illustrative; console simulated until contracts wired |

## 8. Repo layout
```
/src           web app (landing + agent console + sentinel panel)
/docs          PRD.md, ARCHITECTURE.md
/contracts     Odra: wRWA, BasketVault, Rebalancer, Sentinel policy   (next)
/agent         Bun: perceive→regime→decide→act loop                   (next)
/mcp           MCP tool definitions                                    (next)
```
