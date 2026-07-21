#!/usr/bin/env bun
// Kairos — live confidential settlement on Ethereum Sepolia via iExec Nox.
//
//   bun run nox:demo
//
// Runs the full owner → agent lifecycle against the deployed KairosAgentVault:
//   1. fund an encrypted treasury budget
//   2. register an agent with an encrypted per-call cap
//   3. settle a payment within cap   → authorized
//   4. settle a payment over cap     → rejected, budget untouched
//
// Every amount is encrypted client-side; the chain stores handles, never values.
import { NoxVaultClient, isNoxConfigured, loadNoxConfig } from "@fabric/nox-chain";

const config = loadNoxConfig();

if (!isNoxConfigured(config)) {
  console.error("Nox not configured. Set VAULT_CONTRACT_ADDRESS and");
  console.error("CHAIN_WORKER_SECRET_KEY in .env, then deploy with:");
  console.error("  cd contracts && bun run deploy:sepolia");
  process.exit(1);
}

const wei = (v: bigint) => `${v} wei`;
const step = (n: number, label: string) => console.log(`\n[${n}] ${label}`);

console.log("Kairos — confidential settlement demo");
console.log(`vault:   ${config.vaultAddress}`);
console.log(`network: Ethereum Sepolia (${config.chainId})`);

const client = await NoxVaultClient.create(config);

// The owner key also acts as the agent here, so one funded account drives the
// whole lifecycle. In production these are separate keys.
const agent = await client.signerAddress();

const BUDGET = 1_000_000n; // encrypted treasury
const CAP = 10_000n; // encrypted per-call cap
const WITHIN = 5_000n; // should be authorized
const OVER = 50_000n; // should be rejected (over cap)
const RECIPIENT = "0x000000000000000000000000000000000000dEaD";

step(1, `fund encrypted budget (${wei(BUDGET)})`);
const funded = await client.fund(BUDGET);
console.log(`    tx: ${funded.explorerUrl}`);

step(2, `register agent ${agent} with encrypted cap (${wei(CAP)})`);
const registered = await client.registerAgent(agent, CAP);
console.log(`    tx: ${registered.explorerUrl}`);

step(3, `settle ${wei(WITHIN)} — within cap, expect AUTHORIZED`);
const ok = await client.settle(RECIPIENT, WITHIN);
console.log(`    tx: ${ok.explorerUrl}`);
console.log(`    authorized: ${ok.authorized}`);
console.log(`    agent spent (decrypted): ${wei(ok.spentWei)}`);

step(4, `settle ${wei(OVER)} — over cap, expect REJECTED`);
const rejected = await client.settle(RECIPIENT, OVER);
console.log(`    tx: ${rejected.explorerUrl}`);
console.log(`    authorized: ${rejected.authorized}`);
console.log(`    agent spent (decrypted): ${wei(rejected.spentWei)}`);

step(5, "owner reads encrypted budget");
const remaining = await client.readBudget();
console.log(`    remaining (decrypted by owner): ${wei(remaining)}`);
console.log(`    expected: ${wei(BUDGET - WITHIN)} (only the in-cap spend debited)`);

step(6, "batching — epoch state before flush");
const before = await client.epochStatus();
const epochTotal = await client.readEpochTotal();
console.log(`    epoch ${before.epoch}: ${before.count} settlements batched`);
console.log(`    epoch total (decrypted by owner): ${wei(epochTotal)}`);

step(7, "owner flushes the epoch — one aggregate event for the whole batch");
const flushed = await client.flushEpoch();
console.log(`    tx: ${flushed.explorerUrl}`);
const after = await client.epochStatus();
console.log(`    now epoch ${after.epoch}, count reset to ${after.count}`);

console.log("\nWhat an on-chain observer sees:");
console.log("  · PrivateSettlement(epoch) — no agent, no recipient, no amount");
console.log("  · EpochSettled(epoch, count) — one aggregate per batch");
console.log("Amounts, caps, running totals and the payment graph stay private.");
