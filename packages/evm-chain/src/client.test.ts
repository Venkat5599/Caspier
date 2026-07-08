import { describe, expect, test } from "bun:test";
import { ChainWorker, DemoChainStore } from "./client.ts";
import type { ChainConfig } from "./config.ts";

const demoConfig: ChainConfig = {
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  chainName: "sepolia",
  chainId: 11155111,
  network: "testnet",
  secretKeyHex: null,
  publicKeyHex: "0x0101010101010101010101010101010101010101",
  explorerBase: "https://sepolia.etherscan.io/tx/",
  demoMode: true,
};

describe("Sepolia demo chain", () => {
  test("transfer records demo tx", async () => {
    const store = new DemoChainStore();
    const worker = new ChainWorker(demoConfig, store);
    const tx = await worker.transfer({
      recipientPublicKeyHex: demoConfig.publicKeyHex!,
      amountWei: "1000",
      nonce: "n1",
    });
    expect(tx.demo).toBe(true);
    expect(tx.deployHash).toHaveLength(64);
    expect(tx.proof.startsWith("eth:demo:")).toBe(true);
    const verified = await worker.verifyPayment(tx.proof, {
      recipientPublicKeyHex: demoConfig.publicKeyHex!,
      amountWei: "1000",
    });
    expect(verified.success).toBe(true);
  });
});
