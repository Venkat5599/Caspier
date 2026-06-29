# contracts

Solidity contracts for the authorization rail.

- **SmartAccount** — EOA → smart account via ERC-7702 delegation.
- **SessionKey** — scoped, expiring delegations (allowed contracts/assets/methods, max value, rate).
- **Enforcement** — every agent tx validated against scope; over-scope reverts; revoke in 1 tx.

> Scaffold. To be initialized with Foundry (`forge init`) in Phase 1. Chain: EVM (Cronos default — confirm). External audit required before mainnet.
