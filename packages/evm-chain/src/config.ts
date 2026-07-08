export interface ChainConfig {
  rpcUrl: string;
  chainName: string;
  chainId: number;
  network: "testnet" | "mainnet" | "dev";
  secretKeyHex: string | null;
  publicKeyHex: string | null;
  explorerBase: string;
  demoMode: boolean;
}

export function loadChainConfig(): ChainConfig {
  const network = (process.env.EVM_NETWORK ?? process.env.SEPOLIA_NETWORK ?? "testnet") as ChainConfig["network"];
  const demoMode =
    process.env.FABRIC_DEMO_CHAIN === "true" ||
    (!process.env.CHAIN_WORKER_SECRET_KEY &&
      !process.env.EVM_SECRET_KEY &&
      !process.env.SEPOLIA_PRIVATE_KEY);

  const chainName = process.env.SEPOLIA_CHAIN_NAME ?? "sepolia";
  const chainId = Number(process.env.EVM_CHAIN_ID ?? process.env.SEPOLIA_CHAIN_ID ?? "11155111");

  return {
    rpcUrl: process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
    chainName,
    chainId,
    network,
    secretKeyHex:
      process.env.CHAIN_WORKER_SECRET_KEY ??
      process.env.EVM_SECRET_KEY ??
      process.env.SEPOLIA_PRIVATE_KEY ??
      null,
    publicKeyHex:
      process.env.SEPOLIA_PUBLIC_KEY ??
      process.env.EVM_PUBLIC_KEY ??
      "0x0101010101010101010101010101010101010101",
    explorerBase: process.env.SEPOLIA_EXPLORER_BASE ?? "https://sepolia.etherscan.io/tx/",
    demoMode,
  };
}

export function explorerUrl(base: string, txHash: string): string {
  return `${base.replace(/\/+$/, "")}/${txHash.replace(/^\/+/, "")}`;
}
