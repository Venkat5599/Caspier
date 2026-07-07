export interface ChainConfig {
  rpcUrl: string;
  chainName: string;
  network: "testnet" | "mainnet" | "dev";
  secretKeyHex: string | null;
  publicKeyHex: string | null;
  explorerBase: string;
  demoMode: boolean;
}

export function loadChainConfig(): ChainConfig {
  const network = (process.env.CASPER_NETWORK ?? "testnet") as ChainConfig["network"];
  const demoMode =
    process.env.FABRIC_DEMO_CHAIN === "true" ||
    (!process.env.CHAIN_WORKER_SECRET_KEY && !process.env.CASPER_SECRET_KEY);

  const chainName =
    process.env.CASPER_CHAIN_NAME ?? (network === "mainnet" ? "casper" : "casper-test");

  return {
    rpcUrl: process.env.CASPER_RPC_URL ?? "https://node.testnet.casper.network/rpc",
    chainName,
    network,
    secretKeyHex: process.env.CHAIN_WORKER_SECRET_KEY ?? process.env.CASPER_SECRET_KEY ?? null,
    publicKeyHex:
      process.env.CASPER_PUBLIC_KEY ??
      "0101010101010101010101010101010101010101010101010101010101010101",
    explorerBase:
      process.env.CASPER_EXPLORER_BASE ??
      (network === "mainnet"
        ? "https://cspr.live/deploy/"
        : "https://testnet.cspr.live/deploy/"),
    demoMode,
  };
}

export function explorerUrl(base: string, deployHash: string): string {
  return `${base.replace(/\/+$/, "")}/${deployHash}`;
}
