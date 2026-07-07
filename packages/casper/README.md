# @fabric/casper

Casper on-chain engine for Agent Fabric. Mirrors the role of `sdk/kage-onchain.ts` in [kagezks](https://github.com/Venkat5599/kagezks).

## Exports

```typescript
import { ChainWorker, payThroughSession, chainStatus } from "@fabric/casper";
import { payThroughSession } from "@fabric/casper/onchain";
```

## Demo mode

Set `FABRIC_DEMO_CHAIN=true` or omit `CHAIN_WORKER_SECRET_KEY` to use the in-memory demo chain.
