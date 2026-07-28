# Kairos × iExec Nox — WTF Hackathon Summer Edition

## One-liner

**A Safe module that gives any existing Gnosis Safe a confidential agent
payroll.** Budgets, per-agent spending caps and individual payment amounts live
encrypted inside iExec Nox; the Safe is never forked, never modified, and its
funds never migrate.

## Why this answers the brief

The brief asks for a real, impactful open-source protocol made private with Nox,
*without modifying the underlying protocol*. Safe is that protocol: the most
widely deployed smart-account standard in the ecosystem, and public by design —
every treasury movement, every counterparty, every amount is visible forever.

Kairos adds privacy through Safe's own extension point. A Safe owner calls
`enableModule(kairosVault)` once. From then on the vault can move funds through
`execTransactionFromModule`, and the entire authorization layer — who may spend,
how much per call, how much is left — happens on encrypted values inside Nox.

Nothing about Safe changes. No fork, no upgrade, no migration, no custom
deployment. Composability is intact: the Safe is still a Safe, still works with
the Safe UI and every other module, and the owner can remove Kairos with
`disableModule` at any time. That is the "layer, don't fork" property the brief
asks for, expressed through one line of Safe's existing API.

## What Nox actually does here

This is not a Nox sprinkle on a conventional app. The authorization decision
itself is confidential computation — it could not be written on a transparent
chain.

| Step | Where it runs | What leaks |
|------|---------------|------------|
| Owner funds a budget | `Nox.add` on `euint256` | nothing |
| Agent registered with a per-call cap | encrypted handle + ACL grant | that *an* agent was registered |
| Agent settles a payment | `Nox.le(amount, cap)` → `Nox.select` → `Nox.safeSub(budget, …)` | nothing |
| Outcome of the check | `ebool`, ACL-scoped to owner + that agent | nothing |
| Batch closes | `Nox.allowPublicDecryption` on the epoch total | one aggregate, deliberately |

Three Nox properties carry the design:

1. **`safeSub` instead of `sub` + `require`.** Debiting an encrypted budget with
   revert-on-underflow would leak the balance through the revert. `safeSub`
   returns an `ebool` flag instead, so an over-budget attempt is
   indistinguishable from a funded one.
2. **`select` instead of branching.** An `ebool` cannot gate a `require` — that
   would publish the comparison. Authorization is `select(withinCap, amount, 0)`:
   debit the amount, or debit zero, with identical observable behaviour.
3. **The ACL as the permission model.** `allow(handle, owner)` plus
   `allow(handle, agent)` gives exactly "the owner sees everything, an agent sees
   only its own cap and spend" with no permissions layer of our own.

The subtle part is what happens after `select`. A naive implementation silently
debits zero and the transaction still *succeeds*, so an over-budget agent looks
served. Kairos writes the outcome to an encrypted per-agent flag and the gateway
**fails closed** on it: any decryption failure, RPC error or unreachable Nox
gateway blocks the paid call rather than granting free access.

## Counterparty privacy: batching

Encrypting amounts is not enough. One settlement transaction per API call leaks
the payment graph through timing and frequency alone.

So settlements do not move funds. Each debit accumulates into an encrypted epoch
total, and `PrivateSettlement(epoch)` is emitted carrying **no addresses and no
amount**. The owner later closes the epoch, which releases one publicly
decryptable aggregate, and `executeBatch` moves that single sum out of the Safe
through `execTransactionFromModule`.

An observer sees one transfer covering N payments and cannot decompose it. That
aggregate is the deliberate, documented cost of the design — everything else
stays encrypted.

## What is public, precisely

**Public:** the vault and Safe addresses, that settlements occurred in an epoch,
how many a batch contained, the relayer address, and each closed batch's
aggregate.

**Private:** the treasury budget and what remains, every agent's per-call cap,
every agent's cumulative spend, every individual payment amount, and whether any
given settlement was authorized.

**Known limitation, stated plainly:** `msg.sender` is public, so an agent
submitting its own settlement is identifiable. Kairos routes every settlement
through a single gateway relayer, so on-chain all settlements share one sender
and per-agent activity is not distinguishable.

## Architecture

```
Safe (Sepolia, unmodified, open source)
   │  enableModule(vault)  ← the only change to Safe, and it is reversible
   ▼
KairosAgentVault  ── Nox confidential contract ──┐
   │  encrypted budget · encrypted per-agent cap │  euint256 / ebool
   │  encrypted epoch accumulator                │  handles on-chain
   ▼                                             │
Gateway (TypeScript, single relayer) ────────────┘
   │  x402 quote → encrypt amount → settle → fail closed on the ebool
   ▼
Agent (MCP / Claude Code) → vendor API
```

## Verification

- `cd contracts && bun run test` — **25 passing**, covering the Safe module
  surface (installation state, `execTransactionFromModule` forwarding, batch
  execution, every revert guard) and access control, against a real local Nox
  stack with `NoxCompute` deployed.
- `bun run typecheck` — clean across all 14 workspaces.
- `bun run nox:demo` — full owner → agent lifecycle against deployed Sepolia
  contracts with real transactions and real encrypted handles.

The suite caught a genuine production bug before submission: closing an epoch
that absorbed zero settlements reverted, because `allowPublicDecryption` rejects
the trivially encrypted zero the accumulator is initialised with. See
`feedback.md` item 7 — that finding is written up for iExec.

## Deliverables checklist

- [x] Public GitHub repo, MIT licensed
- [x] `feedback.md` with eight concrete, reproducible findings for iExec
- [x] README with install, Sepolia deploy and demo instructions
- [x] Confidential contract on **Ethereum Sepolia** (`11155111`)
- [x] NoxCompute: `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf`
- [x] Safe module integration, exercised end to end
- [x] Contract test suite (25 tests)
- [x] Functional front-end (`apps/web`) + gateway (`apps/gateway`)
- [x] Graph workflow engine + drag-and-drop canvas
- [ ] Demo video ≤ 4 minutes
- [ ] X post tagging `@iEx_ec`

## What we contribute back to iExec

`feedback.md` is not a formality. Two of its findings are defects a future
integrator would otherwise rediscover the hard way:

- **Item 7** — `allowPublicDecryption` reverts on trivially encrypted handles
  while `allow`/`allowThis` no-op on them. Initialising an encrypted accumulator
  from a constant is the obvious pattern, and it is the one that breaks. We
  include the error selector (`0xc1045af6` = `PublicHandleACLForbidden()`), which
  viem surfaces only as "an unrecognized custom error".
- **Item 8** — the plugin's `hardhat test` override and a bare
  `network.connect()` attach to different chains, so `Nox.*` reverts with a
  message that reads like an ABI bug. We include the working test wiring.

Both come with suggested fixes, and this repo is a working reference for the
Safe-module-over-Nox pattern that any other team can copy.

## Prior work vs. this hackathon

Per the brief's originality requirement, stated explicitly.

**Existing before this hackathon:** the Kairos gateway, the SKILL.md catalog,
MCP tooling, the x402 quote/pay/retry flow, the workflow graph engine and
canvas, and the dashboard shell.

**Built during this hackathon:** every Nox integration — `KairosAgentVault.sol`,
`packages/nox-chain`, the `/nox/*` gateway routes including the Safe module
endpoints, the confidential vault UI, the Safe module surface, the contract test
suite, `scripts/nox-demo.ts`, and this document.

This project was **not** submitted to the previous VIBE Coding Hackathon.

## Links

- [Nox docs](https://docs.iex.ec/nox-protocol/getting-started/welcome)
- [Nox confidential contracts](https://github.com/iExec-Nox/nox-confidential-contracts)
- [Safe modules](https://docs.safe.global/advanced/smart-account-modules)
- [cDeFi wizard](https://cdefi-wizard.iex.ec/)
