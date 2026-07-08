import "@nomicfoundation/hardhat-toolbox";
import "@iexec-nox/nox-hardhat-plugin";
import { config as loadEnv } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

loadEnv({ path: "../.env" });

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC,
      chainId: 11155111,
      accounts: DEPLOYER_KEY.startsWith("0x") && DEPLOYER_KEY.length === 66 ? [DEPLOYER_KEY] : [],
    },
  },
  nox: {
    sepolia: {
      noxCompute: "0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf",
    },
  },
};

export default config;
