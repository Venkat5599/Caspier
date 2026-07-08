import { FabricClient, type InvokeResult } from "./client.ts";

export interface InvokeWithPayOptions {
  baseUrl: string;
  slug: string;
  input: unknown;
  version?: string;
  /** Sepolia public key hex for x402 recipient when auto-paying locally */
  payerWorker?: import("@fabric/evm-chain").ChainWorker;
  onStep?: (step: string) => void;
}

/**
 * Invoke a metered skill endpoint: handles 402 quote, pays on Sepolia, retries with proof.
 * Gateway auto-pay path is used when available; otherwise pays locally via payThroughSession.
 */
export async function invokeWithAutoPay<T = unknown>(
  opts: InvokeWithPayOptions,
): Promise<InvokeResult<T>> {
  const client = new FabricClient({ baseUrl: opts.baseUrl, autoPay: true });
  try {
    return await client.invoke<T>(opts.slug, opts.input, opts.version);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("402 payment required")) throw err;
    throw new Error(
      `${msg} — ensure gateway is running with FABRIC_DEMO_CHAIN or configure local payer`,
    );
  }
}

export { payThroughSession } from "@fabric/evm-chain/onchain";
