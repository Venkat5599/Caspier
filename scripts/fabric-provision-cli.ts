#!/usr/bin/env bun
// Agent Fabric — provision a scoped session key on Sepolia (demo records intent;
// production: vault registerAgent (session EOA) with weighted threshold).
//
// bun run agent:provision
import { AuthzService } from "@fabric/authz";
import { chainStatus, fabricConfig } from "@fabric/evm-chain/onchain";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const BUILD = join(ROOT, "packages", "Sepolia", "build");

const config = fabricConfig();
const status = chainStatus();

console.log("Agent Fabric — session key provision");
console.log(`network: ${status.network} (demo=${status.demoMode})`);
console.log(`owner:   ${config.publicKeyHex ?? "(unset)"}`);

if (!config.publicKeyHex) {
  console.error("Set SEPOLIA_PUBLIC_KEY in .env");
  process.exit(1);
}

const agentPublicKeyHex =
  process.argv[2] ??
  "0202020202020202020202020202020202020202020202020202020202020202";

const maxSpend = process.argv[3] ?? "5000000000"; // 5 ETH in wei
const expiresAt =
  process.argv[4] ?? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

const authz = new AuthzService(config.publicKeyHex);
const rec = authz.mint(agentPublicKeyHex, {
  maxSpendPerCall: maxSpend,
  expiresAt,
});

mkdirSync(BUILD, { recursive: true });
const out = {
  sessionKeyId: rec.id,
  agentPublicKeyHex: rec.agentPublicKeyHex,
  ownerPublicKeyHex: rec.ownerPublicKeyHex,
  maxSpendPerCall: rec.scope.maxSpendPerCall,
  expiresAt: rec.scope.expiresAt,
  deployHash: rec.deployHash,
  explorerUrl: rec.explorerUrl,
  demo: rec.demo,
};

writeFileSync(join(BUILD, "agent_fabric.json"), JSON.stringify(out, null, 2));

console.log("\nScoped session key minted (demo registry):");
console.log(JSON.stringify(out, null, 2));
console.log(
  "\nProduction: use vault registerAgent (session EOA) with low weight + action thresholds.",
);
console.log(`Saved: ${join(BUILD, "agent_fabric.json")}`);
