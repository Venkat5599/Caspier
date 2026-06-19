# Bastion — Product Requirements Document

**The autonomous All-Weather agent on Casper.**
An AI agent that builds, monitors, and rebalances a Ray Dalio All-Weather portfolio of tokenized real-world assets on the Casper Network. Non-custodial. It pays for its own market data via native x402.

- **Event:** Casper Agentic Buildathon 2026 — Casper Innovation Track
- **Pillars hit:** Agentic AI ✓ · DeFi ✓ · RWA ✓ (all three)
- **Status:** Draft v0.1 — pending go/no-go
- **Submission deadline:** June 30, 2026

---

## 1. Problem

Inflation quietly erased ~30% of global savings purchasing power in 5 years. Ray Dalio's All-Weather portfolio (Bridgewater) survives every macro regime — but it's locked behind institutional minimums and active management. Retail can't access it, and even if they could, rebalancing across 5 asset classes is manual, emotional, and slow.

DeFi promised access but delivered casinos. There is no autonomous, non-custodial way for an ordinary person to hold a disciplined, inflation-resistant RWA portfolio that manages itself.

## 2. Solution

Bastion is an autonomous agent, not a dashboard. The user sets a risk profile and deposits stablecoins. The agent then:

1. **Perceives** — pulls macro signals + RWA prices through paid data APIs, paying per request via Casper's native x402.
2. **Decides** — computes portfolio drift from the target All-Weather allocation; decides if a rebalance is warranted (threshold-based, not constant churn).
3. **Acts** — executes swaps/rebalances on-chain through the Casper smart contract that custodies the basket. The user always holds the keys (self-custody).
4. **Reports** — every perception, decision, and action is logged with a clickable Casper Testnet deploy hash.

This is a genuine perceive→decide→act loop, which is what separates an *agent* from auto-execution.

## 3. Why Casper (defensible, not portable)

- **Native x402 facilitator** (live June 2026) — the agent pays for its own data feeds per-request on-chain. Bastion is a real x402 *consumer*, producing on-chain payment txns. On other L1s x402 is bolted on; here it's native.
- **Upgradeable contracts** (Casper-unique) — rebalance logic and allocation targets can be updated without redeploying or migrating user funds.
- **MCP servers + CSPR.cloud streaming** — the agent reads chain state and monitors fills via the official toolkit.
- **Odra** — the basket-custody + rebalance contracts ship in the framework the AI Toolkit already supports.

## 4. Scope

### In scope (MVP for buildathon)
- Landing site (institutional, conversion-focused) — the public face + demo host.
- **Live agent demo**: visible perceive→decide→rebalance loop with on-chain Testnet deploy hashes.
- Allocation engine: All-Weather target + drift detection + rebalance plan.
- Tokenized RWA basket contract (Odra) on Casper Testnet.
- x402-paid data fetch (one real paid feed call per cycle, on-chain proof).
- Inflation-erosion calculator (interactive, retail hook).
- 25-year All-Weather vs S&P performance comparison (illustrative chart).
- Self-custody deposit/withdraw flow via CSPR.click wallet.

### Out of scope (v1)
- Real tokenized securities (no Ondo equivalent on Casper yet → **we mint our own test RWA tokens** representing TLT/SPX/GLD/etc. Clearly labeled Testnet.)
- Fiat on-ramp / email login (Privy-style) — roadmap, not demo.
- "Alpha" discretionary trading module — roadmap.
- Mainnet deployment.
- Cross-chain.

## 5. Honest disclosures (anti-DQ)

- All code original to this Buildathon. Concept inspired by the All-Weather strategy (public, Dalio) and the retail-RWA framing; **no third-party product code, branding, or assets reused.**
- RWA tokens are Testnet mocks — stated plainly in UI and README.
- Performance numbers are backtested/illustrative, labeled as such.

## 6. Users

- **Primary:** inflation-anxious retail saver who wants "set it and it runs itself," non-custodial.
- **Secondary:** crypto-native user who wants a disciplined defensive (beta) sleeve separate from their degen (alpha) plays.

## 7. Core user flow

1. Land → see inflation hook + All-Weather credibility → "Launch Agent."
2. Connect CSPR.click wallet → pick risk profile → deposit test stablecoins.
3. Agent activates → live loop visible (perceive/decide/act) → first rebalance executes on-chain.
4. User watches portfolio hold target weights; every action has an explorer link.
5. Withdraw anytime (self-custody proof).

## 8. Success criteria

| Buildathon requirement | How Bastion meets it |
|---|---|
| Working prototype on Testnet | Basket + rebalance contracts deployed, live |
| Transaction-producing on-chain component | x402 data payment + rebalance deploys per cycle |
| Open-source repo + README | Yes, with setup + "what's mocked" section |
| Demo video | Scripted live agent loop walkthrough |
| Agentic AI (judging weight) | Real perceive→decide→act autonomy |
| RWA + DeFi relevance | Tokenized RWA basket, autonomous rebalancing |
| Long-term launch plan | Roadmap: real RWA partners, fiat on-ramp, mainnet |

## 9. Risks

| Risk | Mitigation |
|---|---|
| No real RWA assets on Casper Testnet | Mint labeled mock RWA tokens; frame as Testnet demo |
| Testnet/RPC instability during judging | Pre-recorded live-run backup; explorer links stay valid |
| x402 facilitator API immature | Wrap one real paid call; degrade gracefully to logged stub if down |
| "Just a clone" perception | Original brand/code + the agentic loop is the new IP; lead with autonomy in demo |
| 30-day scope | Cut to: 1 basket, 5 assets, threshold rebalance, 1 paid feed |

## 10. Open questions — RESOLVED (go decision: GO)

1. ✅ CSPR.click — works on Testnet; bonus Google/Apple/email login + card on-ramp.
2. ✅ x402 facilitator — live; works on Testnet; buildathon sponsors free usage.
3. ✅ AMM/swap — **CSPR.trade live on Testnet** (Uniswap-V2 AMM, Odra, real pools) + has an MCP server. Custom TestPool dropped; agent rebalances through CSPR.trade.

Only remaining mock: wRWA tokens (CEP-18) — minted by us, seeded into CSPR.trade pools so swaps are genuinely on-chain.
