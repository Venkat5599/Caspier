#!/usr/bin/env bun
// Deploy a real Gnosis Safe on Sepolia and install KairosAgentVault on it as a
// module.
//
//   bun run safe:attach
//
// This is the step that makes the project's central claim concrete: Kairos does
// not fork, modify or redeploy Safe. It deploys a stock Safe 1.4.1 from the
// canonical SafeProxyFactory, then calls `enableModule` — one line of Safe's
// own public API — and from that point the vault can move funds through
// `execTransactionFromModule`. Removing Kairos is `disableModule`, equally
// unremarkable.
import { Contract, JsonRpcProvider, Wallet, ZeroAddress, parseEther } from "ethers";
import { NoxVaultClient, isNoxConfigured, loadNoxConfig } from "@fabric/nox-chain";

// Canonical Safe 1.4.1 deployments, identical across supported chains. Checked
// for code before use — a silent typo would burn gas against an empty address.
const SAFE_PROXY_FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";
const SAFE_SINGLETON_L2 = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762";
const SAFE_FALLBACK_HANDLER = "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99";

/** ETH placed in the Safe so a batch actually has something to move. */
const SAFE_FUNDING = parseEther("0.002");

const FACTORY_ABI = [
  "function createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
];

const SAFE_ABI = [
  "function setup(address[] _owners, uint256 _threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)",
  "function enableModule(address module)",
  "function isModuleEnabled(address module) view returns (bool)",
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool)",
];

const config = loadNoxConfig();

if (!isNoxConfigured(config)) {
  console.error("Nox not configured. Set VAULT_CONTRACT_ADDRESS and");
  console.error("CHAIN_WORKER_SECRET_KEY in .env, then deploy with:");
  console.error("  cd contracts && bun run deploy:sepolia");
  process.exit(1);
}

const provider = new JsonRpcProvider(config.rpcUrl, config.chainId);
const owner = new Wallet(config.privateKey!, provider);

const step = (n: number, label: string) => console.log(`\n[${n}] ${label}`);
const explorer = (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`;

console.log("Kairos — install the vault as a Safe module");
console.log(`vault:   ${config.vaultAddress}`);
console.log(`owner:   ${owner.address}`);
console.log(`network: Ethereum Sepolia (${config.chainId})`);

step(0, "verify the canonical Safe 1.4.1 deployments hold code");
for (const [label, address] of Object.entries({
  SafeProxyFactory: SAFE_PROXY_FACTORY,
  SafeL2: SAFE_SINGLETON_L2,
  FallbackHandler: SAFE_FALLBACK_HANDLER,
})) {
  const code = await provider.getCode(address);
  if (code === "0x") {
    console.error(`    ${label} has no code at ${address} — wrong chain or address`);
    process.exit(1);
  }
  console.log(`    ok  ${label} ${address}`);
}

step(1, "deploy a stock Safe (1 owner, threshold 1)");

// `setup` runs inside the proxy via delegatecall, so it is encoded against the
// singleton ABI and handed to the factory as the initializer.
const safeInterface = new Contract(SAFE_SINGLETON_L2, SAFE_ABI, owner).interface;
const initializer = safeInterface.encodeFunctionData("setup", [
  [owner.address], // owners
  1n, // threshold
  ZeroAddress, // to — no setup module
  "0x", // data
  SAFE_FALLBACK_HANDLER,
  ZeroAddress, // paymentToken
  0n, // payment
  ZeroAddress, // paymentReceiver
]);

const factory = new Contract(SAFE_PROXY_FACTORY, FACTORY_ABI, owner);
const saltNonce = BigInt(Date.now());

// Resolve the proxy address before sending, so it is known regardless of how
// the ProxyCreation event is shaped in a given Safe version.
const predicted: string = await factory.createProxyWithNonce.staticCall(
  SAFE_SINGLETON_L2,
  initializer,
  saltNonce,
);

const deployTx = await factory.createProxyWithNonce(SAFE_SINGLETON_L2, initializer, saltNonce);
await deployTx.wait();
console.log(`    safe: ${predicted}`);
console.log(`    tx:   ${explorer(deployTx.hash)}`);

const safe = new Contract(predicted, SAFE_ABI, owner);
console.log(`    owners:    ${(await safe.getOwners()).join(", ")}`);
console.log(`    threshold: ${await safe.getThreshold()}`);

step(2, `fund the Safe with ${SAFE_FUNDING} wei so a batch has something to move`);
const fundTx = await owner.sendTransaction({ to: predicted, value: SAFE_FUNDING });
await fundTx.wait();
console.log(`    tx: ${explorer(fundTx.hash)}`);
console.log(`    safe balance: ${await provider.getBalance(predicted)} wei`);

step(3, "enableModule(vault) — the only change made to Safe, and it is reversible");

// `enableModule` is `authorized`, i.e. callable only by the Safe itself, so it
// goes through `execTransaction`. With threshold 1 and the caller being the
// sole owner, Safe accepts a pre-validated signature: r = the owner address,
// s = 0, v = 1. No ECDSA signing is needed because `msg.sender == owner`.
const preValidatedSignature =
  "0x" +
  owner.address.slice(2).toLowerCase().padStart(64, "0") +
  "0".repeat(64) +
  "01";

const enableData = safeInterface.encodeFunctionData("enableModule", [config.vaultAddress]);

const enableTx = await safe.execTransaction(
  predicted, // to — the Safe calls itself
  0n, // value
  enableData,
  0, // operation: CALL, never DELEGATECALL
  0n, // safeTxGas
  0n, // baseGas
  0n, // gasPrice
  ZeroAddress, // gasToken
  ZeroAddress, // refundReceiver
  preValidatedSignature,
);
await enableTx.wait();
console.log(`    tx: ${explorer(enableTx.hash)}`);

const enabled: boolean = await safe.isModuleEnabled(config.vaultAddress);
console.log(`    Safe reports module enabled: ${enabled}`);
if (!enabled) {
  console.error("    enableModule did not take effect — stopping");
  process.exit(1);
}

step(4, "point the vault at the Safe");
const client = await NoxVaultClient.create(config);
const setTx = await client.setSafe(predicted);
console.log(`    tx: ${setTx.explorerUrl}`);

step(5, "verify the installation from both sides");
const safeFromVault = await client.safeAddress();
const installed = await client.isInstalledOnSafe();
console.log(`    vault.safe():              ${safeFromVault}`);
console.log(`    vault.isInstalledOnSafe(): ${installed}`);

if (!installed) {
  console.error("\nInstallation incomplete.");
  process.exit(1);
}

console.log("\nInstalled. Add to .env (and to the VPS .env):");
console.log(`SAFE_ADDRESS=${predicted}`);
console.log("\nSafe was never forked, modified, or migrated. It is a stock");
console.log("Safe 1.4.1 from the canonical factory, extended through its own");
console.log("module API. `disableModule` removes Kairos at any time.");
console.log("\nNext: bun run nox:demo — step 9 now executes a real batch");
console.log("through execTransactionFromModule.");
