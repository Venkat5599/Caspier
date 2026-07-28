# Kairos — 4-minute demo script

Shot-by-shot. Every URL, command and line to say. Recorded straight through
this is about 20 minutes including retakes.

**Record at 1920×1080.** Browser zoom 110% so text survives compression.

**Before you start — open these tabs in order:**

1. `https://sepolia.etherscan.io/address/0x685116E7Daa5d0d0ce340794E4820FF866Adc16e` (the Safe)
2. `https://sepolia.etherscan.io/address/0x9aadfcd6e318a804c11ccff362b28a651e8dba66` (the vault)
3. `https://kairos-frontend-v969.vercel.app/dashboard?tab=vault` (the app)
4. A terminal in the repo root

**Rule for the whole video: lead with the chain, not the UI.** The dashboard is
the weakest evidence you have; Etherscan is the strongest. Judges have seen a
hundred dashboards.

---

## 0:00–0:25 — The problem, stated once

> "Safe is the most widely used smart account in crypto, and it is completely
> public. Every payment, every counterparty, every amount, visible forever.
> That is fine for a DAO vote. It is not fine for paying AI agents, where the
> spend pattern *is* the strategy.
>
> Kairos makes a Safe treasury confidential using iExec Nox — without forking
> Safe, without modifying it, and without moving the funds."

No slides. Talk over tab 1.

---

## 0:25–1:10 — The integration, proven on-chain

Stay on **tab 1**.

> "This is a stock Safe 1.4.1, deployed from the canonical SafeProxyFactory.
> Unmodified. I did exactly one thing to it: `enableModule`."

Show the enableModule transaction, point at the vault address.

> "That is Kairos, installed through Safe's own public API. One line. And
> `disableModule` removes it. Safe never changed, and the funds never left."

Switch to **tab 2** (the vault), Contract → Read.

> "The vault is a Nox confidential contract. Look at what it stores — the
> budget, the caps, the spend totals are encrypted handles. The chain holds
> ciphertext, not values."

---

## 1:10–2:20 — The part that only works on Nox

Terminal:

```bash
bun run nox:demo
```

Let it run. Narrate over it. **This is the heart of the video — do not rush it.**

When steps 3 and 4 land:

> "Two settlements. The first is inside the agent's cap: authorized. The second
> is over the cap: rejected.
>
> Here is the part worth pausing on. The rejected one **did not revert**. It is
> a successful transaction that debited zero. Because you cannot branch on an
> encrypted comparison — reverting would leak the answer. So authorization is
> `select(withinCap, amount, 0)`: debit the amount, or debit nothing, and both
> look identical on-chain.
>
> The cap was never decrypted. Nobody watching the chain can tell which of those
> two transactions was approved."

When step 5 prints the budget:

> "Only the in-cap spend was debited. The owner can decrypt that. Nobody else
> can."

---

## 2:20–3:10 — Batching, and why encryption alone is not enough

Continue through steps 6–9.

> "Encrypting amounts is not sufficient. One transaction per API call leaks the
> payment graph through timing alone — you could just count the calls.
>
> So settlements do not move funds. They accumulate into an encrypted epoch
> total, and the event carries no addresses and no amount. Only an epoch number.
>
> The owner closes the epoch, one aggregate becomes public, and a single
> transfer leaves the Safe through `execTransactionFromModule`."

Step 9 prints the tx. Open it on Etherscan.

> "One transfer, covering two payments. An observer sees the total and cannot
> decompose it. That aggregate is the deliberate cost of the design — everything
> else stays encrypted."

**Say the limitation out loud. It reads as competence, not weakness:**

> "To be straight about the trust model: the gateway holds the owner key and
> relays every settlement, so it sees plaintext. This is privacy from the chain,
> not from the operator. Routing every agent through one relayer is also what
> makes per-agent activity indistinguishable on-chain."

---

## 3:10–3:40 — The app, briefly

**Tab 3.** Do not linger. Thirty seconds.

> "The same thing through the UI: encrypted budget, per-agent caps, and the Safe
> module panel reading live from the chain — epoch 1, aggregate 5,000 wei,
> covering two settlements."

---

## 3:40–4:00 — Close on what you gave back

Open `feedback.md`.

> "We wrote tests, and they caught a real Nox bug: `allowPublicDecryption`
> reverts on a trivially encrypted handle while `allow` silently no-ops on one,
> so closing an empty batch failed. That is item 7, with the error selector,
> because viem only reports it as an unrecognized custom error.
>
> Eight items, with reproductions and suggested fixes. MIT licensed, and it is a
> working reference for the Safe-module-over-Nox pattern."

End on the repo URL.

---

## Verified facts you can state without hedging

Everything below was confirmed by running it, not inferred:

| Claim | Evidence |
|---|---|
| Safe unmodified, module enabled | `Safe.isModuleEnabled(vault) == true` |
| Vault knows its Safe | `vault.isInstalledOnSafe() == true` |
| Batch left through Safe | tx `0xd711bd9e…95b` |
| Over-cap settle debits zero | `nox:demo` step 4, `authorized: false` |
| 25 contract tests pass | `cd contracts && bun run test` |
| Typecheck clean | 14/14 workspaces |
| UI renders live chain data | epoch 1 / 5,000 wei / 2 settlements |

## Do not claim

- That the operator cannot see amounts. It can. Say "private from the chain."
- That owner routes are protected in the live demo. `NOX_OWNER_TOKEN` is unset
  and `/nox/status` honestly reports `ownerRoutesProtected: false`.
- Any throughput or gas number. Never measured.

## Addresses

- Vault: `0x9aadfcd6e318a804c11ccff362b28a651e8dba66`
- Safe: `0x685116E7Daa5d0d0ce340794E4820FF866Adc16e`
- NoxCompute: `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf`
- Network: Ethereum Sepolia (11155111)

## X post

> Kairos gives any @safe treasury a confidential agent payroll, using @iEx_ec
> Nox.
>
> Budgets, per-agent caps and payment amounts run encrypted. The authorization
> check itself happens on ciphertext — an over-cap payment succeeds and debits
> nothing, indistinguishable on-chain from an approved one.
>
> Safe is never forked. Installed with `enableModule`, removed with
> `disableModule`.
>
> Live on Sepolia. MIT. Video + repo below.
