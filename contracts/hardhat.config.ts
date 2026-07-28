import { defineConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import noxPlugin from "@iexec-nox/nox-hardhat-plugin";
import { config as loadEnv } from "dotenv";

// contracts/.env wins; repo-root .env is the fallback for a shared setup.
loadEnv({ path: ".env" });
loadEnv({ path: "../.env" });

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const accounts =
  DEPLOYER_KEY.startsWith("0x") && DEPLOYER_KEY.length === 66 ? [DEPLOYER_KEY] : [];

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, noxPlugin],
  solidity: "0.8.35",
  networks: {
    // Local Nox stack — the plugin injects NoxCompute bytecode here for tests.
    default: {
      type: "edr-simulated",
      chainType: "op",
      allowUnlimitedContractSize: true,
    },
    // `hardhat test` is wrapped by the Nox plugin, which starts a node on
    // 127.0.0.1:8545 and etches NoxCompute into it. Tests must attach to THAT
    // node: calling `network.connect()` with no argument spins up a second,
    // separate in-process chain where NoxCompute does not exist, and every
    // `Nox.*` call then reverts with "function returned an unexpected amount
    // of data" — a call to an address holding no code.
    noxLocal: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: SEPOLIA_RPC,
      chainId: 11155111,
      accounts,
    },
  },
});
