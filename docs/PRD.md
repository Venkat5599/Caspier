# Bastion + Sentinel — Product Requirements Document (FINAL)

**A regime-aware AI agent that can't go rogue — on Casper.**

- **Bastion** — the AI agent. Reads the macro regime, tilts a Ray Dalio All-Weather portfolio of tokenized RWAs, and rebalances on-chain.
- **Sentinel** — the native authorization & kill-switch rail that lets that agent act with bounded, instantly-revocable authority, using Casper's weighted-key account model.

> Bastion is the star (the AI). Sentinel is what makes autonomous AI *safe* — and is only natively possible on Casper.

- **Event:** Casper Agentic Buildathon 2026 — Casper Innovation Track (single track)
- **Pillars:** Agentic AI ✓ (primary) · DeFi & Payments ✓ · RWA ✓
- **Status:** FINALIZED concept — building
- **Deadline:** June 30, 2026

---

## 1. Problem

Two problems, one product:

1. **Inflation** quietly erased ~30% of global savings' purchasing power in 5 years. Ray Dalio's All-Weather portfolio survives every macro regime but is locked behind institutions and manual rebalancing. Retail has no autonomous, non-custodial way to hold it.
2. **Autonomous AI agents are unsafe to let near money.** 2026's #1 unsolved agent problem is authorization / spend-caps / kill-switch:
   - Harvard/MIT/Stanford red-team (Feb 2026): agents deleted DBs, exfiltrated SSNs, **no working kill switch**.
   - Real incident: an AI agent deleted a production DB + every backup in **9 seconds**.
   - **RSA 2026: "Agent Security" was the single largest category (41 companies).** OWASP / NIST / Microsoft / Okta / ServiceNow all shipping agent governance.

You can't give an AI agent your money until you can bound it and kill it instantly. Today you can't.

## 2. Solution

**Bastion** is an AI agent the user runs on demand. Each run it autonomously:

1. **Perceives** — macro (growth, inflation) + RWA prices via an endpoint it pays for with **x402**.
2. **Classifies the regime** — growth × inflation → one of four Dalio regimes (Goldilocks / Reflation / Deflation / Stagflation). *Real AI judgment, not fixed weights.*
3. **Tilts + decides** — tilts All-Weather targets toward the regime; computes drift vs band.
4. **Acts** — rebalances on-chain through the **CSPR.trade** AMM.

**Sentinel** is the rail every Bastion action passes through:

- The agent holds a **low-weight associated key** on the user's Casper account — enough to *spend* (deploy threshold) but **not** to manage keys (can't escalate, remove keys, or drain). User keeps the high-weight key.
- An **upgradeable policy contract** enforces runtime caps: per-tx limit, daily spend, contract/method allowlist (only CSPR.trade + the x402 facilitator), rate limit.
- **Instant kill:** user removes the agent's key in one deploy → agent is dead on-chain immediately. Authority *is* the key — revoke it and everything it could do (and delegate) stops.

> Why 10/10 and unique to Casper: regime tilting = real AI; Sentinel = solves the hottest agent-safety problem using **weighted associated keys + action thresholds + upgradeable contracts**, a primitive no other major L1 has natively. Every Casper agent can reuse Sentinel — picks-and-shovels.

## 3. Why Casper (not portable)

- **Weighted associated keys + action thresholds** — scoped, revocable agent authority at L1 account level. Elsewhere this needs smart-wallet / PDA / session-key hacks.
- **Upgradeable contracts** — policy + rebalance logic update without migrating funds.
- **Native x402 facilitator** — the agent pays for its own data on-chain, capped by Sentinel.
- **CSPR.trade AMM** (live Testnet) — real swaps.
- **MCP + CSPR.cloud** — agent reads/streams chain via the official toolkit.

## 4. Scope

### In scope (MVP)
- Landing site + **live agent console** (regime detection, tilt, reputation, Sentinel caps + kill).
- **Sentinel contracts:** policy contract (caps + allowlist), agent-key setup (weighted associated key), revocation flow.
- **Bastion agent:** perceive→regime→decide→act loop; x402-paid data; CSPR.trade swaps.
- **wRWA** CEP-18 ×5 + BasketVault (custody).
- Self-custody via CSPR.click; deposit/withdraw.
- Inflation calculator + 25-yr performance chart (retail hooks).

### Out of scope (v1)
- Real tokenized securities → **wRWA test tokens** (labeled).
- Fiat on-ramp / mainnet / cross-chain.
- Multi-agent delegation trees (Sentinel handles single agent for v1).

## 5. Honest disclosures (anti-DQ)
- All code original to this Buildathon. Concept inspired by the public All-Weather strategy + retail-RWA framing; no third-party product code, branding, or assets reused.
- wRWA are Testnet mocks (stated in UI + README).
- Performance figures backtested/illustrative.

## 6. Users
- **Retail saver** who wants inflation-resistant, hands-off, non-custodial wealth — and proof the bot can't run off with it.
- **Any Casper agent builder** who needs bounded authority → reuses Sentinel.

## 7. Core flow
1. Land → inflation hook + All-Weather credibility → "Launch agent."
2. CSPR.click connect → set risk + **spend caps** → deposit → grant agent its low-weight key (Sentinel).
3. Run Bastion → live perceive→regime→act loop; rebalances via CSPR.trade under caps.
4. Hit a cap → action blocked on-chain. Revoke key → agent dies on-chain. (The killer demo.)
5. Withdraw anytime (self-custody).

## 8. Success criteria → rubric
| Requirement | Met by |
|---|---|
| Working prototype on Testnet | Sentinel + BasketVault + agent live |
| Transaction-producing on-chain | x402 payment + CSPR.trade swaps + key-revocation deploys |
| Open-source + README | Yes, incl. "what's mocked" |
| Demo video | Live loop + cap-block + kill-switch |
| Use of AI / Agentic | LLM regime decisions (Bastion) |
| DeFi & RWA | tokenized basket, autonomous rebalancing |
| Innovation / originality | Sentinel = Casper-unique authorization primitive |
| Long-term impact | Sentinel = reusable infra for all Casper agents |

## 9. Risks
| Risk | Mitigation |
|---|---|
| No real RWA on Testnet | labeled wRWA test tokens |
| Testnet/RPC lag in judging | pre-recorded backup; explorer links stay valid |
| x402 network detail | buildathon sponsors usage; confirm net at onboarding |
| Sentinel key model complexity | v1 = single agent key + one policy contract; document clearly |
| "Is it AI?" doubt | Bastion's LLM regime decisions are the visible AI; lead with them |

## 10. Dependencies — RESOLVED (GO)
1. ✅ CSPR.click — Testnet + email/social login.
2. ✅ x402 facilitator — live; Testnet; sponsored for teams.
3. ✅ CSPR.trade — live Testnet AMM (Odra) + MCP server.
4. ✅ Weighted associated keys + action thresholds — native Casper account feature (Sentinel's foundation).

Remaining mock: wRWA tokens (CEP-18), seeded into CSPR.trade pools so swaps are real.
