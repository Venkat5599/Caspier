import { describe, expect, test } from "bun:test";
import { ChainWorker, DemoChainStore } from "./client.ts";
import type { ChainConfig } from "./config.ts";

const demoConfig: ChainConfig = {
  rpcUrl: "https://node.testnet.casper.network/rpc",
  chainName: "casper-test",
  network: "testnet",
  secretKeyHex: null,
  publicKeyHex: "0101010101010101010101010101010101010101010101010101010101010101",
  explorerBase: "https://testnet.cspr.live/deploy/",
  demoMode: true,
};

describe("casper demo chain", () => {
  test("transfer records demo deploy", async () => {
    const store = new DemoChainStore();
    const worker = new ChainWorker(demoConfig, store);
    const tx = await worker.transfer({
      recipientPublicKeyHex: demoConfig.publicKeyHex!,
      amountMotes: "1000",
      nonce: "n1",
    });
    expect(tx.demo).toBe(true);
    expect(tx.deployHash).toHaveLength(64);
    const verified = await worker.verifyPayment(tx.proof, {
      recipientPublicKeyHex: demoConfig.publicKeyHex!,
      amountMotes: "1000",
    });
    expect(verified.success).toBe(true);
  });
});
