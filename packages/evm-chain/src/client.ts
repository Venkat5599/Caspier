import { ethers } from "ethers";
import { EvmRpc, txSucceeded, extractTransfer } from "./rpc.ts";
import { DemoChainStore, demoTransfer } from "./demo.ts";
import { explorerUrl, loadChainConfig, type ChainConfig } from "./config.ts";

export interface TransferRequest {
  recipientPublicKeyHex: string;
  amountWei: string;
  nonce?: string;
}

export interface TransferResult {
  deployHash: string;
  explorerUrl: string;
  senderPublicKeyHex: string;
  recipientPublicKeyHex: string;
  amountWei: string;
  demo: boolean;
  proof: string;
}

export interface DeployStatus {
  deployHash: string;
  success: boolean;
  demo: boolean;
  transfer?: {
    senderPublicKeyHex: string;
    recipientPublicKeyHex: string;
    amountWei: string;
  };
}

export interface ChainStatus {
  configured: boolean;
  demoMode: boolean;
  network: string;
  rpcUrl: string;
  publicKeyHex: string | null;
  explorerBase: string;
}

const globalDemoStore = new DemoChainStore();

/** Sepolia signing + RPC. Demo fallback when no secret key is configured. */
export class ChainWorker {
  private readonly rpc: EvmRpc;
  readonly config: ChainConfig;
  readonly demoStore: DemoChainStore;

  constructor(config: ChainConfig = loadChainConfig(), demoStore = globalDemoStore) {
    this.config = config;
    this.rpc = new EvmRpc(config.rpcUrl);
    this.demoStore = demoStore;
  }

  get publicKeyHex(): string | null {
    return this.config.publicKeyHex;
  }

  isConfigured(): boolean {
    return !this.config.demoMode && !!this.config.secretKeyHex;
  }

  status(): ChainStatus {
    return {
      configured: this.isConfigured(),
      demoMode: this.config.demoMode,
      network: this.config.network,
      rpcUrl: this.config.rpcUrl,
      publicKeyHex: this.publicKeyHex,
      explorerBase: this.config.explorerBase,
    };
  }

  async getBalanceWei(publicKeyHex: string): Promise<string> {
    if (this.config.demoMode) return "1000000000000000000";
    return this.rpc.getBalanceWei(publicKeyHex);
  }

  /** Send ETH transfer (real via ethers on Sepolia when configured, else demo chain). */
  async transfer(req: TransferRequest): Promise<TransferResult> {
    const sender = this.requirePublicKey();
    const nonce = req.nonce ?? crypto.randomUUID();

    if (this.config.demoMode) {
      const d = demoTransfer(this.demoStore, this.config, {
        senderPublicKeyHex: sender,
        recipientPublicKeyHex: req.recipientPublicKeyHex,
        amountWei: req.amountWei,
        nonce,
      });
      return {
        deployHash: d.deployHash,
        explorerUrl: d.explorerUrl,
        senderPublicKeyHex: sender,
        recipientPublicKeyHex: req.recipientPublicKeyHex,
        amountWei: req.amountWei,
        demo: true,
        proof: d.proof,
      };
    }

    const hash = await this.transferViaEthers(req);
    return {
      deployHash: hash,
      explorerUrl: explorerUrl(this.config.explorerBase, hash),
      senderPublicKeyHex: sender,
      recipientPublicKeyHex: req.recipientPublicKeyHex,
      amountWei: req.amountWei,
      demo: false,
      proof: `eth:tx:${hash}`,
    };
  }

  /** Verify a payment proof against quote expectations. */
  async verifyPayment(
    proof: string,
    expected: { recipientPublicKeyHex: string; amountWei: string },
  ): Promise<DeployStatus> {
    const hash = this.demoStore.parseHash(proof);
    const demoRec = this.demoStore.get(hash);
    if (demoRec) {
      const ok =
        demoRec.recipientPublicKeyHex === expected.recipientPublicKeyHex &&
        BigInt(demoRec.amountWei) >= BigInt(expected.amountWei);
      return {
        deployHash: hash,
        success: ok,
        demo: true,
        transfer: {
          senderPublicKeyHex: demoRec.senderPublicKeyHex,
          recipientPublicKeyHex: demoRec.recipientPublicKeyHex,
          amountWei: demoRec.amountWei,
        },
      };
    }

    const receipt = await this.rpc.getTransactionReceipt(hash);
    const success = txSucceeded(receipt);
    const t = extractTransfer(receipt);
    const transfer = t
      ? {
          senderPublicKeyHex: t.senderAccount,
          recipientPublicKeyHex: expected.recipientPublicKeyHex,
          amountWei: t.amountWei,
        }
      : undefined;

    const ok =
      success &&
      transfer !== undefined &&
      BigInt(transfer.amountWei) >= BigInt(expected.amountWei);

    return { deployHash: hash, success: ok, demo: false, transfer };
  }

  private requirePublicKey(): string {
    if (!this.config.publicKeyHex) {
      throw new Error("SEPOLIA_PUBLIC_KEY not set");
    }
    return this.config.publicKeyHex;
  }

  /** Sign and broadcast a native ETH transfer on Sepolia via ethers. */
  private async transferViaEthers(req: TransferRequest): Promise<string> {
    const secret = this.config.secretKeyHex;
    if (!secret) throw new Error("CHAIN_WORKER_SECRET_KEY not set");

    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl, this.config.chainId);
    const wallet = new ethers.Wallet(secret, provider);
    const tx = await wallet.sendTransaction({
      to: req.recipientPublicKeyHex,
      value: BigInt(req.amountWei),
    });
    const receipt = await tx.wait();
    if (!receipt?.hash) {
      throw new Error("ethers did not return transaction hash");
    }
    return receipt.hash;
  }
}

export { loadChainConfig, explorerUrl, DemoChainStore };
