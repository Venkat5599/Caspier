import { createHash, randomBytes } from "node:crypto";
import { explorerUrl, type ChainConfig } from "./config.ts";

export interface DemoTransferRecord {
  deployHash: string;
  senderPublicKeyHex: string;
  recipientPublicKeyHex: string;
  amountWei: string;
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
    return proof.startsWith("eth:demo:") || this.transfers.has(proof.replace(/^eth:tx:/, ""));
  }

  parseHash(proof: string): string {
    if (proof.startsWith("eth:tx:")) return proof.slice("eth:tx:".length);
    if (proof.startsWith("eth:demo:")) return proof.slice("eth:demo:".length);
    return proof;
  }
}

export function demoTransfer(
  store: DemoChainStore,
  config: ChainConfig,
  input: {
    senderPublicKeyHex: string;
    recipientPublicKeyHex: string;
    amountWei: string;
    nonce: string;
  },
) {
  const rec = store.record({
    senderPublicKeyHex: input.senderPublicKeyHex,
    recipientPublicKeyHex: input.recipientPublicKeyHex,
    amountWei: input.amountWei,
    nonce: input.nonce,
  });
  return {
    deployHash: rec.deployHash,
    explorerUrl: explorerUrl(config.explorerBase, rec.deployHash),
    demo: true as const,
    proof: `eth:demo:${rec.deployHash}`,
  };
}
