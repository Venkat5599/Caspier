import type { Context } from "hono";
import type { CatalogUnit } from "@fabric/catalog";
import type { PaymentService } from "@fabric/payments";
import type { ExecutionService } from "@fabric/execution";
import type { ChainWorker } from "@fabric/chain-worker";
import { explorerUrl } from "@fabric/chain-worker";
import { x402Body } from "@fabric/payments";

export async function handleInvoke(
  c: Context,
  unit: CatalogUnit,
  slug: string,
  payments: PaymentService,
  execution: ExecutionService,
  chain: ChainWorker,
  autoPay: boolean,
) {
  let input: unknown = {};
  try {
    input = await c.req.json();
  } catch {
    input = {};
  }

  const price = unit.manifest.pricing.pricePerCall;
  if (price === "0") {
    const run = await execution.run(unit, input);
    return c.json({ result: run.output, runtimeMs: run.runtimeMs });
  }

  if (autoPay) {
    const body = input as { nonce?: string; input?: unknown };
    const quote = body.nonce ? payments.getQuote(body.nonce) : undefined;
    if (!quote) return c.json({ error: "invalid or expired nonce" }, 400);
    const payProof = await payments.autoPay(quote);
    const verified = await payments.verifyProof(payProof, quote);
    if (!verified.ok) return c.json({ error: verified.error ?? "payment failed" }, 402);
    const run = await execution.run(unit, body.input ?? {});
    const usage = payments.recordUsage({
      slug,
      nonce: quote.nonce,
      deployHash: verified.deployHash,
      amountWei: quote.priceWei,
      demo: verified.demo,
    });
    return c.json({
      result: run.output,
      payment: {
        deployHash: verified.deployHash,
        demo: verified.demo,
        explorerUrl: explorerUrl(chain.config.explorerBase, verified.deployHash),
      },
      usage,
      runtimeMs: run.runtimeMs,
    });
  }

  const proof = c.req.header("x-payment-proof");
  const nonce = c.req.header("x-payment-nonce");
  if (!proof) {
    const quote = payments.createQuote(slug, unit.manifest, unit.id);
    if (!quote) {
      const run = await execution.run(unit, input);
      return c.json({ result: run.output, runtimeMs: run.runtimeMs });
    }
    return c.json(x402Body(quote), 402);
  }

  const quote = nonce ? payments.getQuote(nonce) : undefined;
  if (!quote) return c.json({ error: "invalid or expired nonce — retry after 402" }, 400);
  const verified = await payments.verifyProof(proof, quote);
  if (!verified.ok) return c.json({ error: verified.error ?? "payment failed" }, 402);

  const run = await execution.run(unit, input);
  const usage = payments.recordUsage({
    slug,
    nonce: quote.nonce,
    deployHash: verified.deployHash,
    amountWei: quote.priceWei,
    demo: verified.demo,
  });
  return c.json({
    result: run.output,
    payment: {
      deployHash: verified.deployHash,
      demo: verified.demo,
      explorerUrl: explorerUrl(chain.config.explorerBase, verified.deployHash),
    },
    usage,
    runtimeMs: run.runtimeMs,
  });
}
