#!/usr/bin/env bun
// Invoke a metered skill through the gateway with auto x402 pay.
//
// bun run scripts/agent-invoke.ts <slug> [gatewayUrl]
import { invokeWithAutoPay } from "@fabric/sdk";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: bun run scripts/agent-invoke.ts <slug> [gatewayUrl]");
  process.exit(1);
}

const baseUrl = process.argv[3] ?? process.env.GATEWAY_PUBLIC_URL ?? "http://localhost:8080";

console.log(`Invoking ${slug} via ${baseUrl} (auto-pay)...`);
const result = await invokeWithAutoPay({
  baseUrl,
  slug,
  input: { ping: true },
  onStep: (s) => console.log(`  ${s}`),
});

console.log(JSON.stringify(result, null, 2));
