#!/usr/bin/env bun
// Agent Fabric — end-to-end status + optional demo payment flow.
//
// bun run flow
import { chainStatus, payThroughSession } from "@fabric/evm-chain/onchain";

const status = chainStatus();
console.log("Agent Fabric — Sepolia chain status");
console.log(JSON.stringify(status, null, 2));

if (process.argv.includes("--pay")) {
  const recipient =
    process.env.SEPOLIA_PUBLIC_KEY ??
    "0101010101010101010101010101010101010101010101010101010101010101";
  console.log("\nDemo x402 settlement (transfer)...");
  const result = await payThroughSession({
    recipientPublicKeyHex: recipient,
    amountWei: "1000000000",
    onStep: (s) => console.log(`  ${s}`),
  });
  console.log(JSON.stringify(result, null, 2));
}
