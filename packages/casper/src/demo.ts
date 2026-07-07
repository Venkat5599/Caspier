import { createHash, randomBytes } from "node:crypto";
import { explorerUrl, type ChainConfig } from "./config.ts";

export interface DemoTransferRecord {
  deployHash: string;
  senderPublicKeyHex: string;
  recipientPublicKeyHex: string;
  amountMotes: string;
  nonce: string;
  createdAt: string;
  settled: boolean;
}

/** In-memory demo chain for local dev / hackathon demos without funded keys. */
export class DemoChainStore {
  private readonly transfers = new Map<string, DemoTransferRecord>();

  record(input: Omit<DemoTransferRecord, "deployHash" | "createdAt" | "settled">): DemoTransferRecord {
    const deployHash = createHash("sha256")
      .update(JSON.stringify({ ...input, salt: randomBytes(8).toString("hex") }))
      .digest("hex");
    const rec: DemoTransferRecord = {
      ...input,
      deployHash,
      createdAt: new Date().toISOString(),
      settled: true,
    };
    this.transfers.set(deployHash, rec);
    return rec;
  }

  get(deployHash: string): DemoTransferRecord | undefined {
    return this.transfers.get(deployHash);
  }

  isDemoProof(proof: string): boolean {
    return proof.startsWith("casper:demo:") || this.transfers.has(proof.replace(/^casper:deploy:/, ""));
  }

  parseHash(proof: string): string {
    if (proof.startsWith("casper:deploy:")) return proof.slice("casper:deploy:".length);
    if (proof.startsWith("casper:demo:")) return proof.slice("casper:demo:".length);
    return proof;
  }
}

export function demoTransfer(
  store: DemoChainStore,
  config: ChainConfig,
  input: {
    senderPublicKeyHex: string;
    recipientPublicKeyHex: string;
    amountMotes: string;
    nonce: string;
  },
) {
  const rec = store.record({
    senderPublicKeyHex: input.senderPublicKeyHex,
    recipientPublicKeyHex: input.recipientPublicKeyHex,
    amountMotes: input.amountMotes,
    nonce: input.nonce,
  });
  return {
    deployHash: rec.deployHash,
    explorerUrl: explorerUrl(config.explorerBase, rec.deployHash),
    demo: true as const,
    proof: `casper:demo:${rec.deployHash}`,
  };
}
