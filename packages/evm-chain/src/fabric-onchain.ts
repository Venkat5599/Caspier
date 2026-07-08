// Agent Fabric on-chain engine (Bun/Node) — the shared keystone the gateway, MCP
// server, and CLI scripts all call. No browser wallet dependency.
//
// payThroughSession() is the agent's one action: settle an x402 quote with a
// scoped session key on Sepolia (iExec Nox vault rail).
// The chain worker signs transfers; session scope is enforced at account level.
import {
  ChainWorker,
  loadChainConfig,
  explorerUrl,
  type ChainStatus,
  type TransferResult,
} from "./client.ts";
import type { ChainConfig } from "./config.ts";

export type FabricChainConfig = ChainConfig;

/** Load Sepolia + demo-mode config from environment (.env). */
export function fabricConfig(): FabricChainConfig {
  return loadChainConfig();
}

/** Read-only chain status (demo vs live Sepolia). */
export function chainStatus(worker?: ChainWorker): ChainStatus {
  const w = worker ?? new ChainWorker();
  return w.status();
}

export type PayResult = TransferResult & {
  /** x402 payment proof header value */
  paymentProof: string;
};

/**
 * Pay an x402 quote on Sepolia — transfer ETH (wei) to the quoted recipient.
 * In demo mode (FABRIC_DEMO_CHAIN=true) uses the in-memory demo chain.
 */
export async function payThroughSession(args: {
  recipientPublicKeyHex: string;
  amountWei: string;
  nonce?: string;
  worker?: ChainWorker;
  onStep?: (step: string) => void;
}): Promise<PayResult> {
  const worker = args.worker ?? new ChainWorker();
  args.onStep?.("checking chain mode");
  const st = worker.status();
  if (!st.demoMode && !st.configured) {
    throw new Error(
      "Sepolia chain not configured — set CHAIN_WORKER_SECRET_KEY and SEPOLIA_PUBLIC_KEY, or FABRIC_DEMO_CHAIN=true",
    );
  }

  args.onStep?.(st.demoMode ? "settling on demo chain" : "submitting Sepolia transfer");
  const tx = await worker.transfer({
    recipientPublicKeyHex: args.recipientPublicKeyHex,
    amountWei: args.amountWei,
    nonce: args.nonce,
  });

  return { ...tx, paymentProof: tx.proof };
}

export { ChainWorker, loadChainConfig, explorerUrl };
