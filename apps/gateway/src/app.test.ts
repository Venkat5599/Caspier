import { describe, expect, test } from "bun:test";
import { CatalogService } from "@fabric/catalog";
import { ChainWorker, DemoChainStore } from "@fabric/chain-worker";
import { PaymentService } from "@fabric/payments";
import { ExecutionService } from "@fabric/execution";
import { AuthzService } from "@fabric/authz";
import { createApp } from "./app.ts";
import type { ChainConfig } from "@fabric/chain-worker";

const cfg: ChainConfig = {
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  chainName: "sepolia",
  chainId: 11155111,
  network: "testnet",
  secretKeyHex: null,
  publicKeyHex: "0x0101010101010101010101010101010101010101",
  explorerBase: "https://sepolia.etherscan.io/tx/",
  demoMode: true,
};

function skill(name = "Hello Weather", version = "0.1.0"): string {
  return `---
name: ${name}
version: ${version}
description: Returns a weather summary.
runtime: code
pricing:
  pricePerCall: "1000"
  asset: ETH
inputSchema:
  type: object
  properties:
    city:
      type: string
outputSchema:
  type: object
scope:
  egress:
    - geocoding-api.open-meteo.com
    - api.open-meteo.com
---
# ${name}
Body.`;
}

const md = { "content-type": "text/markdown" };

function freshApp() {
  const catalog = new CatalogService();
  const chain = new ChainWorker(cfg, new DemoChainStore());
  return createApp({
    catalog,
    chain,
    payments: new PaymentService(chain),
    execution: new ExecutionService(),
    authz: new AuthzService(chain.publicKeyHex),
  });
}

describe("gateway", () => {
  test("GET /health includes chain", async () => {
    const app = freshApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { chain: { demoMode: boolean } };
    expect(body.chain.demoMode).toBe(true);
  });

  test("POST /skills publishes a valid skill", async () => {
    const app = freshApp();
    const res = await app.request("/skills", { method: "POST", body: skill(), headers: md });
    expect(res.status).toBe(201);
  });

  test("POST /s/:slug returns 402 then auto-pay executes", async () => {
    const app = freshApp();
    await app.request("/skills", { method: "POST", body: skill(), headers: md });

    const first = await app.request("/s/hello-weather", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ city: "Oslo" }),
    });
    expect(first.status).toBe(402);
    const quote = (await first.json()) as { nonce: string };

    const paid = await app.request("/s/hello-weather/auto-pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nonce: quote.nonce, input: { city: "Oslo" } }),
    });
    expect(paid.status).toBe(200);
    const body = (await paid.json()) as { result: { summary: string }; payment: { deployHash: string } };
    expect(body.result.summary).toContain("Oslo");
    expect(body.payment.deployHash).toBeTruthy();
  });

  test("GET /skills/:slug 404 for unknown", async () => {
    const app = freshApp();
    const res = await app.request("/skills/nope");
    expect(res.status).toBe(404);
  });
});
