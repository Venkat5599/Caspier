# iExec Nox — builder feedback (WTF Hackathon)

> Written during the build, not after. Every item below is something we actually hit.

## Project

**Kairos** — a confidential spending vault for AI agents: an owner funds an
encrypted budget, registers agents with encrypted per-call caps, and agents
settle metered API payments whose amounts never appear on-chain in plaintext.

Versions used: `@iexec-nox/nox-protocol-contracts@0.2.4`,
`@iexec-nox/nox-hardhat-plugin@0.1.0`, `@iexec-nox/handle@0.1.0-beta.13`,
Hardhat `3.11.0`, solc `0.8.35`, Ethereum Sepolia (`11155111`).

## What worked well

- **The `Nox` library is well shaped for real contracts.** Having `add`/`sub`/
  `mul`/`div` alongside `safeAdd`/`safeSub` (which return an `ebool` overflow
  flag instead of reverting) is exactly the right pair of primitives. `safeSub`
  let us debit an encrypted budget without leaking whether the balance covered
  the payment — a plain `sub` plus `require` would have leaked it.
- **`select` + comparison ops are enough to express real authorization.** We
  gate on `le(amount, cap)` then `safeSub(budget, requested)` and combine both
  into one encrypted outcome. No plaintext branch anywhere in the settlement
  path.
- **The ACL model (`allowThis` / `allow` / `isAllowed`) is intuitive.** Granting
  the owner and the specific agent decrypt rights on the same handle made the
  "owner sees everything, agent sees only its own budget" requirement fall out
  naturally instead of needing a permissions layer of our own.
- **`@iexec-nox/handle` has a clean surface.** `createEthersHandleClient(signer)`
  → `encryptInput(value, 'uint256', contractAddress)` → `{ handle, handleProof }`
  is about as small as this API could be, and the ethers/viem split via separate
  factories is the right call.
- **Strict TypeScript types in the handle SDK.** `Handle<SolidityType>` being
  `0x${string}` rather than `string` caught two real bugs in our first draft at
  compile time.

## Friction / bugs

1. **The hardhat plugin requires Hardhat 3, and nothing says so up front.**
   `@iexec-nox/nox-hardhat-plugin@0.1.0` is ESM-only and Hardhat-3-only. On
   Hardhat 2 the failure is:

   ```
   Error: Cannot find module '.../node_modules/hardhat/config'
   imported from .../nox-hardhat-plugin/dist/src/index.js
   Did you mean to import "hardhat/config.js"?
   ```

   That error points at a module resolution problem, not at a major-version
   mismatch, so the obvious next move is to fiddle with ESM/CJS settings — which
   wastes time. A `README` line saying **"requires Hardhat ^3.4"** at the very
   top, or an explicit `engines`/peer-check with a readable message, would have
   saved us the detour.

2. **The peer dependency set cascades painfully.** After upgrading to Hardhat 3,
   `hardhat-toolbox-viem` rejected our install one peer at a time — first
   `@nomicfoundation/hardhat-ignition` (resolved `0.15.16`, wanted `^3.0.7`),
   then `hardhat-network-helpers` (`1.1.2` vs `^3.0.0`), and so on. Package
   managers happily resolve the Hardhat-2-era majors of these packages. We ended
   up pinning **nine** peers by hand. A published starter `package.json` with the
   full known-good version set (or having the plugin depend on the toolbox
   directly) would remove this entirely.

3. **The solc version requirement is undocumented.** `Nox.sol` and its
   dependencies declare `pragma solidity ^0.8.35`, but the plugin README example
   shows `solidity: "0.8.29"`. Following the README verbatim produces:

   ```
   Error HHE909: No solc version enabled in this profile is compatible
   with a dependency of this file
   ```

   The README example should use a version that actually compiles against the
   contracts package it ships with.

4. **`@iexec-nox/nox-handle-sdk` does not exist on npm.** Multiple docs and
   examples reference that name; the real package is **`@iexec-nox/handle`**.
   `npm view @iexec-nox/nox-handle-sdk` returns 404, which is a hard stop for
   anyone following the docs literally.

5. **You cannot `require` on an `ebool`, and that deserves a prominent callout.**
   This is correct and unavoidable — branching on an encrypted comparison would
   leak it — but it inverts a habit every Solidity developer has. Our first
   design assumed over-cap spending would revert. It cannot. The consequence is
   subtle and security-relevant: a naive `select(withinCap, amount, 0)` silently
   debits **zero** and the transaction still *succeeds*, so an over-budget caller
   appears to have been served. We solved it by writing the outcome to an
   encrypted per-agent flag that only the owner and that agent can decrypt, and
   having the off-chain gateway fail closed on it. A "control flow with encrypted
   values" page with exactly this worked example would prevent a whole class of
   quiet authorization bugs.

6. **Handles are computed asynchronously, and reading too early fails with a
   misleading error.** After a settlement transaction was mined we immediately
   decrypted the resulting handle and got:

   ```
   403 {"error":"access_denied","message":"Access denied: not a viewer"}
   ```

   That reads as an ACL/permissions bug, and we spent time auditing our
   `Nox.allow` calls looking for a mistake. The contract was correct — the TEE
   simply had not finished computing the handle yet, so it had no ACL to check
   against. Re-reading the same handles a minute later returned the right
   values.

   This is made worse by fail-closed error handling, which is the correct
   pattern for a payment gate: our `catch` turned "not computed yet" into
   `authorized: false`, silently reporting a *successful* settlement as
   rejected. We fixed it with retry-and-backoff around `decrypt`.

   Two suggestions: distinguish "handle not yet computed" from "caller is not
   a viewer" in the gateway's error response (the SDK already exports
   `NotYetComputedHandleError`, but this path returned a plain 403), and
   document the expected compute latency so integrators know to poll rather
   than assuming a permission problem.

7. **`allowPublicDecryption` reverts on a trivially encrypted handle, and this
   silently bricks a legitimate transaction.** This is the sharpest issue we
   hit, and it only surfaced because we wrote tests.

   A handle produced from a plaintext constant — `Nox.toEuint256(0)`, which is
   the natural way to initialise an encrypted accumulator in a constructor — is
   *trivially encrypted*, i.e. already public. The two ACL functions then behave
   differently:

   - `Nox.allow` / `Nox.allowThis` **no-op** on such a handle. Our constructor
     called both and deployed cleanly.
   - `Nox.allowPublicDecryption` **reverts** with `PublicHandleACLForbidden()`
     (selector `0xc1045af6`).

   The consequence in our contract: an owner closing a batching epoch that had
   absorbed zero settlements reverted, because the epoch accumulator was still
   the trivially encrypted zero it was initialised with. Nothing was wrong with
   the design — a quiet hour on a payment rail is normal — but the owner's
   transaction failed with an undecodable custom error. We fixed it by skipping
   the ACL call when the batch is empty.

   Three suggestions, in order of value:
   - Make `allowPublicDecryption` a no-op on trivially encrypted handles, for
     symmetry with `allow`/`allowThis`. A handle that is already public needs no
     permission to be made public, and that asymmetry is the entire trap.
   - If the revert is intentional, say so in the `Nox` library docs next to
     `toEuint256`, because initialising accumulators from a constant is the
     obvious pattern and it is the one that breaks.
   - Ship the error selectors in a decode table. `0xc1045af6` arrives through
     viem as "an unrecognized custom error"; we had to hash all twelve error
     signatures in `INoxCompute.sol` ourselves to identify it.

8. **`hardhat test` and `network.connect()` attach to different chains, and the
   failure is unreadable.** The plugin's test override starts a node on
   `127.0.0.1:8545` via `hre.network.createServer` and etches `NoxCompute` into
   it. But test code calling `network.connect()` with no argument gets a
   *second*, independent in-process chain where `NoxCompute` was never
   deployed. Every `Nox.*` call then reverts with:

   ```
   Transaction reverted: function returned an unexpected amount of data
       at KairosAgentVault.toEuint256 (…/sdk/Nox.sol:126)
   ```

   That message describes a call to an address holding no code, but it reads
   like an ABI or return-type problem, so the instinct is to audit your own
   contract. The fix is to declare an `http` network pointing at
   `http://127.0.0.1:8545` and connect to it by name.

   Suggestions: document the required test wiring in the plugin README (this is
   step zero for anyone writing tests, and it is currently absent), and have
   `Nox.sol` check `address(noxCompute).code.length` and revert with something
   like `NoxComputeNotDeployed(address)` so the diagnosis is immediate.

## Documentation gaps

- No end-to-end example that goes **contract → encrypt → call → decrypt result**
  in one place. The contracts docs and the handle SDK docs each cover their half.
  The seam between them (what a `bytes32` handle looks like crossing the ABI, and
  that user-defined value types like `euint256` are `bytes32` in the ABI) is
  where the time goes.
- The ACL rules deserve a table: which operations require `allowThis` vs
  `allow`, and what happens on decrypt when permission is missing. We arrived at
  "grant on every write" by trial rather than by reading.
- No guidance on gas cost or latency of encrypted ops relative to plaintext,
  which matters a lot when deciding whether to batch settlements.

## Suggested improvements

- Ship `nox-hardhat-starter` with the exact pinned peer set and reference it as
  step one everywhere. Most of our lost time was dependency resolution, not
  cryptography.
- Add a preflight check in the plugin: if Hardhat's major version is < 3, throw
  `"@iexec-nox/nox-hardhat-plugin requires Hardhat 3.x (found 2.x)"` instead of a
  module-not-found error.
- Document the required solc pragma in the contracts package README, and keep the
  plugin README example in sync with it.
- Consider a `Nox.requireEncrypted(ebool)`-style helper, or explicit
  documentation of the "encrypted flag + off-chain fail-closed check" pattern, so
  the authorization idiom is standardised rather than reinvented per project.

## Time to first confidential tx on Sepolia

Not yet measured end to end. Time from clone to **a compiling confidential
contract** was roughly 2 hours, of which approximately 90 minutes was
toolchain/dependency resolution (items 1–3 above) and about 30 minutes was
actual contract design. Once the toolchain was correct, writing the vault
against the `Nox` library was fast.

## Would you use Nox in production?

For this use case, yes — with reservations. The programming model is genuinely
good: encrypted arithmetic, comparison and `select` are enough to express real
authorization logic, and the ACL system maps cleanly onto multi-party
permissions. The confidential-budget pattern we needed simply is not expressible
on a transparent chain.

The reservations are maturity, not design: `@iexec-nox/handle` is at
`0.1.0-beta`, the plugin at `0.1.0`, and the peer-dependency situation would
block a team without patience. We would also want documented gas and latency
characteristics for encrypted ops before committing to a settlement path that
runs per-API-call. Both are fixable and neither is architectural.
