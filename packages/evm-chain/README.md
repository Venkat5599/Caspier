# @fabric/evm-chain

Ethereum Sepolia chain engine for Kairos: signing, JSON-RPC, and a demo chain for local development.

## Exports

```typescript
import { ChainWorker, payThroughSession, chainStatus } from "@fabric/evm-chain";
import { payThroughSession } from "@fabric/evm-chain/onchain";
```

## Demo mode

Set `FABRIC_DEMO_CHAIN=true` or omit `CHAIN_WORKER_SECRET_KEY` to use the in-memory demo chain.
