import { describe, expect, test } from "bun:test";
import { PaymentService } from "./service.ts";
import { ChainWorker, DemoChainStore } from "@fabric/chain-worker";
import type { ChainConfig } from "@fabric/chain-worker";

const cfg: ChainConfig = {
  rpcUrl: "https://node.testnet.casper.network/rpc",
  chainName: "casper-test",
  network: "testnet",
  secretKeyHex: null,
  publicKeyHex: "0101010101010101010101010101010101010101010101010101010101010101",
  explorerBase: "https://testnet.cspr.live/deploy/",
  demoMode: true,
};

const manifest = {
  name: "hello-weather",
  version: "0.1.0",
  description: "x",
  runtime: "code" as const,
  pricing: { pricePerCall: "1000", asset: "CSPR" },
  inputSchema: { type: "object" },
  outputSchema: { type: "object" },
  scope: { egress: ["api.open-meteo.com"] },
};

describe("payments", () => {
  test("402 quote + auto pay verify", async () => {
    const chain = new ChainWorker(cfg, new DemoChainStore());
    const payments = new PaymentService(chain);
    const quote = payments.createQuote("hello-weather", manifest, "hello-weather@0.1.0")!;
    expect(quote.priceMotes).toBe("1000");
    const proof = await payments.autoPay(quote);
    const v = await payments.verifyProof(proof, quote);
    expect(v.ok).toBe(true);
  });
});
