# Kairos confidential contracts (Nox)

Deploy `KairosAgentVault` on **Ethereum Sepolia** for the WTF hackathon track.

## Prerequisites

- Node 18+ (or Bun for monorepo root)
- Sepolia ETH on deployer wallet
- `.env` at repo root:

```bash
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
DEPLOYER_PRIVATE_KEY=0x...
VAULT_CONTRACT_ADDRESS=   # filled after deploy
```

## Install & deploy

```bash
cd contracts
npm install
npm run compile
npm run deploy:sepolia
```

NoxCompute on Sepolia: `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf`

## Contract

`KairosAgentVault` — owner funds encrypted budget, registers agents with encrypted per-call caps, agents call `settle()` with encrypted amounts. Balances and payment sizes are handles (private); addresses and events remain public (Nox confidentiality model).

Encrypt inputs / decrypt handles with the [Nox JS SDK](https://github.com/iExec-Nox/nox-handle-sdk) from the gateway or dashboard.
