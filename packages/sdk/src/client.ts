export interface FabricClientOptions {
  baseUrl: string;
  /** Optional secret for auto-pay (demo / agent wallet). */
  autoPay?: boolean;
}

export interface InvokeResult<T = unknown> {
  result: T;
  payment?: {
    deployHash: string;
    demo: boolean;
    explorerUrl?: string;
  };
  usage?: { amountMotes: string; slug: string };
  runtimeMs?: number;
}

export interface X402Quote {
  x402: true;
  price: string;
  asset: string;
  recipient: string;
  nonce: string;
  expiresAt: string;
  slug: string;
}

/** Caller SDK — auto-handles x402 402 → pay → retry. */
export class FabricClient {
  constructor(private readonly opts: FabricClientOptions) {}

  private url(path: string): string {
    return `${this.opts.baseUrl.replace(/\/+$/, "")}${path}`;
  }

  async invoke<T = unknown>(
    slug: string,
    input: unknown,
    version?: string,
  ): Promise<InvokeResult<T>> {
    const q = version ? `?version=${encodeURIComponent(version)}` : "";
    const first = await fetch(this.url(`/s/${encodeURIComponent(slug)}${q}`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });

    if (first.status === 402) {
      const quote = (await first.json()) as X402Quote & { nonce: string };
      let proof: string | undefined;

      if (this.opts.autoPay) {
        const pay = await fetch(this.url(`/s/${encodeURIComponent(slug)}/auto-pay${q}`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nonce: quote.nonce, input }),
        });
        if (!pay.ok) {
          const err = await pay.json();
          throw new Error((err as { error?: string }).error ?? "auto-pay failed");
        }
        return (await pay.json()) as InvokeResult<T>;
      }

      throw new Error(
        `402 payment required: ${quote.price} ${quote.asset} — set autoPay or provide X-Payment-Proof`,
      );
    }

    if (!first.ok) {
      const err = await first.json();
      throw new Error((err as { error?: string }).error ?? `invoke failed: ${first.status}`);
    }
    return (await first.json()) as InvokeResult<T>;
  }

  async invokeWithProof<T = unknown>(
    slug: string,
    input: unknown,
    proof: string,
    version?: string,
  ): Promise<InvokeResult<T>> {
    const q = version ? `?version=${encodeURIComponent(version)}` : "";
    const res = await fetch(this.url(`/s/${encodeURIComponent(slug)}${q}`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-payment-proof": proof,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error((err as { error?: string }).error ?? `invoke failed: ${res.status}`);
    }
    return (await res.json()) as InvokeResult<T>;
  }
}
