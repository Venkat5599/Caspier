import type { SkillManifest } from "@fabric/manifest";
import type { ChainWorker } from "@fabric/chain-worker";

export interface PaymentQuote {
  nonce: string;
  slug: string;
  priceWei: string;
  asset: string;
  recipientPublicKeyHex: string;
  expiresAt: string;
  skillId: string;
}

export interface UsageRecord {
  id: string;
  slug: string;
  nonce: string;
  deployHash: string;
  amountWei: string;
  demo: boolean;
  createdAt: string;
}

export interface PaymentVerifyResult {
  ok: boolean;
  deployHash: string;
  demo: boolean;
  error?: string;
}

const globalQuotes = new Map<string, PaymentQuote>();
const globalUsage: UsageRecord[] = [];
const consumedProofs = new Set<string>();

function assetToWei(manifest: SkillManifest): { amount: string; asset: string } {
  const price = manifest.pricing.pricePerCall;
  const asset = manifest.pricing.asset.toUpperCase();
  if (price === "0") return { amount: "0", asset };
  // Treat price as wei for ETH; USDC legacy manifests map 1:1 wei for demo.
  return { amount: price, asset: asset === "USDC" ? "ETH" : asset };
}

export class PaymentService {
  constructor(
    private readonly chain: ChainWorker,
    private readonly recipientPublicKeyHex: string | null = chain.publicKeyHex,
  ) {}

  createQuote(slug: string, manifest: SkillManifest, skillId: string): PaymentQuote | null {
    const { amount, asset } = assetToWei(manifest);
    if (amount === "0") return null;

    const recipient = this.recipientPublicKeyHex;
    if (!recipient) {
      throw new Error("SEPOLIA_PUBLIC_KEY required for paid skills");
    }

    const quote: PaymentQuote = {
      nonce: crypto.randomUUID(),
      slug,
      priceWei: amount,
      asset,
      recipientPublicKeyHex: recipient,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      skillId,
    };
    globalQuotes.set(quote.nonce, quote);
    return quote;
  }

  getQuote(nonce: string): PaymentQuote | undefined {
    return globalQuotes.get(nonce);
  }

  async verifyProof(proofHeader: string, quote: PaymentQuote): Promise<PaymentVerifyResult> {
    if (consumedProofs.has(proofHeader)) {
      return { ok: false, deployHash: "", demo: false, error: "proof already used" };
    }
    if (new Date(quote.expiresAt).getTime() < Date.now()) {
      return { ok: false, deployHash: "", demo: false, error: "quote expired" };
    }

    const status = await this.chain.verifyPayment(proofHeader, {
      recipientPublicKeyHex: quote.recipientPublicKeyHex,
      amountWei: quote.priceWei,
    });

    if (!status.success) {
      return {
        ok: false,
        deployHash: status.deployHash,
        demo: status.demo,
        error: "payment verification failed",
      };
    }

    consumedProofs.add(proofHeader);
    return { ok: true, deployHash: status.deployHash, demo: status.demo };
  }

  recordUsage(input: {
    slug: string;
    nonce: string;
    deployHash: string;
    amountWei: string;
    demo: boolean;
  }): UsageRecord {
    const rec: UsageRecord = {
      id: crypto.randomUUID(),
      slug: input.slug,
      nonce: input.nonce,
      deployHash: input.deployHash,
      amountWei: input.amountWei,
      demo: input.demo,
      createdAt: new Date().toISOString(),
    };
    globalUsage.unshift(rec);
    return rec;
  }

  listUsage(limit = 50): UsageRecord[] {
    return globalUsage.slice(0, limit);
  }

  /** Platform auto-pays for demo / web UI (uses chain worker transfer). */
  async autoPay(quote: PaymentQuote): Promise<string> {
    const result = await this.chain.transfer({
      recipientPublicKeyHex: quote.recipientPublicKeyHex,
      amountWei: quote.priceWei,
      nonce: quote.nonce,
    });
    return result.proof;
  }
}

export function x402Body(quote: PaymentQuote) {
  return {
    x402: true,
    message: "Payment Required",
    price: quote.priceWei,
    asset: quote.asset,
    recipient: quote.recipientPublicKeyHex,
    nonce: quote.nonce,
    expiresAt: quote.expiresAt,
    slug: quote.slug,
    instructions:
      "Pay via Sepolia native transfer, then retry with header X-Payment-Proof: eth:tx:<hash> or POST /s/:slug/auto-pay with { nonce }",
  };
}
