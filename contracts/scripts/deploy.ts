// Deploy KairosAgentVault to Ethereum Sepolia.
//
//   bun run deploy:sepolia
//
// Hardhat 3 + viem: the network connection is opened explicitly rather than
// pulled off a global `hardhat.ethers` (which does not exist under the viem
// toolbox the Nox plugin requires).
import { network } from "hardhat";

const { viem } = await network.connect();

const [wallet] = await viem.getWalletClients();
if (!wallet) {
  throw new Error("no signer — set DEPLOYER_PRIVATE_KEY in contracts/.env");
}

const publicClient = await viem.getPublicClient();
const balance = await publicClient.getBalance({ address: wallet.account.address });

console.log("deployer:", wallet.account.address);
console.log("balance :", balance, "wei");
if (balance === 0n) {
  throw new Error("deployer has 0 ETH — fund it from a Sepolia faucet first");
}

// Safe to spend from. Zero address runs the vault standalone; set SAFE_ADDRESS
// to an existing Safe and enable this vault on it with `enableModule`.
const ZERO = "0x0000000000000000000000000000000000000000";
const safe = (process.env.SAFE_ADDRESS ?? ZERO) as `0x${string}`;

const vault = await viem.deployContract("KairosAgentVault", [safe]);

console.log("");
console.log("KairosAgentVault deployed:", vault.address);
console.log("Safe    :", safe === ZERO ? "(standalone — set SAFE_ADDRESS to attach)" : safe);
console.log("Network: Ethereum Sepolia (11155111)");
console.log("Explorer: https://sepolia.etherscan.io/address/" + vault.address);
console.log("");
console.log("Add to .env:");
console.log("VAULT_CONTRACT_ADDRESS=" + vault.address);
console.log("NEXT_PUBLIC_VAULT_ADDRESS=" + vault.address);
