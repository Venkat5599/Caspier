import { ethers } from "hardhat";

async function main() {
  const Vault = await ethers.getContractFactory("KairosAgentVault");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();
  const addr = await vault.getAddress();
  console.log("KairosAgentVault deployed:", addr);
  console.log("Network: Ethereum Sepolia (11155111)");
  console.log("Set VAULT_CONTRACT_ADDRESS=" + addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
