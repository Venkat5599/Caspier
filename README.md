# Kairos

**Confidential spending controls for AI agents, on Ethereum Sepolia.**

An AI agent that pays for things needs a budget it cannot exceed. Enforcing that
budget on a public chain means publishing it — the cap, the running total, and
every payment. Kairos keeps the enforcement and drops the disclosure: budgets and
caps live as encrypted values inside [iExec Nox](https://docs.iex.ec/nox-protocol/getting-started/welcome),
compared inside a TEE, and never appear on-chain in plaintext.

| | Live |
|---|---|
| Vault contract | [`0xc32b31b03ad745598b790fb8cd8a94a47d893829`](https://sepolia.etherscan.io/address/0xc32b31b03ad745598b790fb8cd8a94a47d893829) |
| Network | Ethereum Sepolia (`11155111`) |
| NoxCompute | `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf` |

---

## The problem

x402 is an open payment standard: a server answers `402 Payment Required` with a
price, the caller pays on-chain, retries with proof, and gets the resource. It is
public by design, and that is the right default for a settlement standard.

It is the wrong default for an agent's budget. Run a fleet of agents against
metered APIs over x402 and the chain publishes an operational diary: which agent
is active, how often, against which vendor, for how much, and how much of its
allowance remains. Anyone can read it. For a company that is a competitive leak
before it is a privacy problem.

Kairos leaves x402 and MCP exactly as they are — the gateway still speaks plain
HTTP 402, agents still discover tools over MCP — and moves only the *authorization
and accounting* into Nox.

## What is hidden, and what is not

Being precise about this matters more than the feature list.

**Private** — encrypted handles, decryptable only by permitted accounts:
- the treasury budget and what remains of it
- each agent's per-call spending cap
- each agent's cumulative spend
- the amount of any individual settlement
- **whether a given settlement was authorized or rejected**

**Public:**
- that a settlement occurred, and in which epoch
- how many settlements a batch contained
- the relayer address that submitted the transaction

Two design choices produce the counterparty privacy. Settlement events carry
**no addresses and no amount** — only an epoch number — so logs cannot be used to
build a payment graph. And debits **batch**: they accumulate into an encrypted
epoch total that the owner flushes as one aggregate event, so there is no
one-transaction-per-API-call trail to correlate by timing.

**Known limitation, stated plainly:** `msg.sender` is inherently public. Kairos
routes settlements through a single gateway relayer, so on-chain every settlement
shares one sender and per-agent activity is not distinguishable — but the relayer
itself is visible, and it learns what it relays.

## How the encrypted authorization works

An `ebool` cannot gate a `require`. Reverting on an encrypted comparison would
leak the comparison result, which defeats the purpose. So authorization is
branchless:

```solidity
ebool  withinCap = Nox.le(amount, s.capPerCall);
euint256 requested = Nox.select(withinCap, amount, zero);

// safeSub reports underflow as an encrypted flag rather than reverting,
// which would leak whether the treasury covered the payment.
(ebool funded, euint256 remaining) = Nox.safeSub(budget, requested);

euint256 debited = Nox.select(funded, requested, zero);
budget          = Nox.select(funded, remaining, budget);
```

An over-cap call debits zero and the transaction still succeeds — indistinguishable
on-chain from an authorized one. The outcome is written to an encrypted flag that
only the owner and that agent can decrypt, and the gateway **fails closed** on it:
if the flag cannot be read, the paid action does not proceed.

## Try it

```bash
bun install
cp .env.example .env          # add SEPOLIA_RPC_URL + a funded key

cd contracts && bun install
bun run deploy:sepolia        # prints VAULT_CONTRACT_ADDRESS

cd .. && bun run nox:demo     # full lifecycle against the live vault
bun run gateway:dev           # API on :8080
bun run web:dev               # dashboard on :5173 → /dashboard?tab=vault
```

`bun run nox:demo` funds an encrypted budget, registers an agent with an
encrypted cap, settles once within cap (authorized) and once over it (rejected),
shows the owner-decrypted balance moving by exactly the authorized amount, then
flushes the epoch. Every step prints a real Sepolia transaction.

## API

```
GET    /nox/status           vault address, relayer, current epoch
GET    /nox/budget           owner-decrypted budget + epoch total
POST   /nox/fund             fund with an encrypted amount
POST   /nox/agents           register an agent with an encrypted cap
GET    /nox/agents/:agent    ACL-gated decrypted cap and spend
DELETE /nox/agents/:agent    revoke in one transaction
POST   /nox/settle           settle; 402 when not authorized
GET    /nox/epoch            batching state
POST   /nox/epoch/flush      close the batch
```

The x402 surface is unchanged: `POST /s/:slug` still returns a 402 quote and
executes on retry with proof.

## Layout

```
contracts/            KairosAgentVault.sol — the confidential vault
packages/nox-chain/   NoxVaultClient over @iexec-nox/handle
packages/{manifest,fabric-core,authz,sdk,evm-chain}
apps/gateway/         Hono API: x402, catalog, /nox/*
apps/web/             Next.js dashboard
apps/mcp-server/      MCP gateway — skills as agent tools
services/{catalog,payments,execution,identity}
scripts/nox-demo.ts   end-to-end confidential settlement
```

## Stack

Solidity 0.8.35 · Hardhat 3 · `@iexec-nox/nox-protocol-contracts` ·
`@iexec-nox/handle` · Bun · TypeScript · Hono · Next.js 16 · ethers v6

---

## Prior work and what was built for this hackathon

This repository has history before the WTF hackathon, and the brief asks that
this be stated explicitly.

**Pre-existing:** the x402 gateway and quote/settle flow, the SKILL.md manifest
parser and catalog, the MCP server, the Next.js dashboard shell and marketplace,
and the n8n workflow integration. Earlier iterations of this project targeted
other chains; that lineage is in the git history.

**Built during this hackathon:**
- `contracts/KairosAgentVault.sol` — the confidential vault, including the
  branchless encrypted authorization, `safeSub`-based debiting, the
  address-free settlement event, and epoch batching
- `packages/nox-chain` — the entire Nox client layer
- `apps/gateway/src/nox.ts` — the `/nox/*` API
- `apps/web/components/fabric/nox-vault-section.tsx` — the vault dashboard
- `scripts/nox-demo.ts`, the Hardhat 3 migration, and `feedback.md`

No part of this project was submitted to the previous VIBE Coding Hackathon.

## Honest status

- Sepolia testnet only. Not audited. Do not put real funds behind it.
- The vault is accounting, not custody: it authorizes and records encrypted
  debits. Wiring the flush to an actual aggregate ERC-20 or ETH transfer is the
  next step.
- `apps/gateway/src/fabric/store.ts` is still in-memory, so the marketplace
  catalog resets on restart.
- Skill execution supports one built-in handler; arbitrary SKILL.md bodies are
  not yet sandboxed.

Builder feedback on the iExec tooling is in [`feedback.md`](./feedback.md).
