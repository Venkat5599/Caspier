import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CasperRpc, deploySucceeded, extractTransfer } from "./rpc.ts";
import { DemoChainStore, demoTransfer } from "./demo.ts";
import { explorerUrl, loadChainConfig, type ChainConfig } from "./config.ts";

export interface TransferRequest {
  recipientPublicKeyHex: string;
  amountMotes: string;
  nonce?: string;
}

export interface TransferResult {
  deployHash: string;
  explorerUrl: string;
  senderPublicKeyHex: string;
  recipientPublicKeyHex: string;
  amountMotes: string;
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
    amountMotes: string;
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

/** Casper signing + RPC. Demo fallback when no secret key is configured. */
export class ChainWorker {
  private readonly rpc: CasperRpc;
  readonly config: ChainConfig;
  readonly demoStore: DemoChainStore;

  constructor(config: ChainConfig = loadChainConfig(), demoStore = globalDemoStore) {
    this.config = config;
    this.rpc = new CasperRpc(config.rpcUrl);
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

  /** Send CSPR transfer (real via casper-client when configured, else demo chain). */
  async transfer(req: TransferRequest): Promise<TransferResult> {
    const sender = this.requirePublicKey();
    const nonce = req.nonce ?? crypto.randomUUID();

    if (this.config.demoMode) {
      const d = demoTransfer(this.demoStore, this.config, {
        senderPublicKeyHex: sender,
        recipientPublicKeyHex: req.recipientPublicKeyHex,
        amountMotes: req.amountMotes,
        nonce,
      });
      return {
        deployHash: d.deployHash,
        explorerUrl: d.explorerUrl,
        senderPublicKeyHex: sender,
        recipientPublicKeyHex: req.recipientPublicKeyHex,
        amountMotes: req.amountMotes,
        demo: true,
        proof: d.proof,
      };
    }

    const hash = await this.transferViaCli(req);
    return {
      deployHash: hash,
      explorerUrl: explorerUrl(this.config.explorerBase, hash),
      senderPublicKeyHex: sender,
      recipientPublicKeyHex: req.recipientPublicKeyHex,
      amountMotes: req.amountMotes,
      demo: false,
      proof: `casper:deploy:${hash}`,
    };
  }

  /** Verify a payment proof against quote expectations. */
  async verifyPayment(
    proof: string,
    expected: { recipientPublicKeyHex: string; amountMotes: string },
  ): Promise<DeployStatus> {
    const hash = this.demoStore.parseHash(proof);
    const demoRec = this.demoStore.get(hash);
    if (demoRec) {
      const ok =
        demoRec.recipientPublicKeyHex === expected.recipientPublicKeyHex &&
        BigInt(demoRec.amountMotes) >= BigInt(expected.amountMotes);
      return {
        deployHash: hash,
        success: ok,
        demo: true,
        transfer: {
          senderPublicKeyHex: demoRec.senderPublicKeyHex,
          recipientPublicKeyHex: demoRec.recipientPublicKeyHex,
          amountMotes: demoRec.amountMotes,
        },
      };
    }

    const result = await this.rpc.getDeploy(hash);
    const success = deploySucceeded(result);
    const t = extractTransfer(result);
    const transfer = t
      ? {
          senderPublicKeyHex: t.senderAccount,
          recipientPublicKeyHex: expected.recipientPublicKeyHex,
          amountMotes: t.amountMotes,
        }
      : undefined;

    const ok =
      success &&
      transfer !== undefined &&
      BigInt(transfer.amountMotes) >= BigInt(expected.amountMotes);

    return { deployHash: hash, success: ok, demo: false, transfer };
  }

  private requirePublicKey(): string {
    if (!this.config.publicKeyHex) {
      throw new Error("CASPER_PUBLIC_KEY not set");
    }
    return this.config.publicKeyHex;
  }

  /** Use casper-client CLI for real testnet transfers (installed on VPS / Docker). */
  private transferViaCli(req: TransferRequest): Promise<string> {
    const secret = this.config.secretKeyHex;
    if (!secret) throw new Error("CHAIN_WORKER_SECRET_KEY not set");

    const dir = mkdtempSync(join(tmpdir(), "fabric-chain-"));
    const keyPath = join(dir, "secret.pem");
    const pem = secret.includes("BEGIN")
      ? secret
      : `-----BEGIN PRIVATE KEY-----\n${secret}\n-----END PRIVATE KEY-----`;
    writeFileSync(keyPath, pem, { mode: 0o600 });

    const node = process.env.CASPER_NODE_ADDRESS ?? "https://node.testnet.casper.network:7777";
    const args = [
      "transfer",
      "--node-address",
      node,
      "--chain-name",
      this.config.chainName,
      "--secret-key",
      keyPath,
      "--target-account",
      req.recipientPublicKeyHex,
      "--transfer-amount",
      req.amountMotes,
      "--payment-amount",
      "100000000",
      "--transfer-id",
      String(Date.now() % 2_000_000_000),
    ];

    const bin = process.env.CASPER_CLIENT_BIN ?? "casper-client";
    const out = spawnSync(bin, args, { encoding: "utf8", timeout: 120_000 });
    try {
      unlinkSync(keyPath);
    } catch {
      /* ignore */
    }

    if (out.status !== 0) {
      throw new Error(
        `casper-client transfer failed: ${(out.stderr || out.stdout || "unknown").slice(0, 300)}`,
      );
    }

    const match = (out.stdout + out.stderr).match(/deploy hash:\s*([0-9a-f]{64})/i);
    if (!match?.[1]) {
      throw new Error("casper-client did not return deploy hash");
    }
    return Promise.resolve(match[1]);
  }
}

export { loadChainConfig, explorerUrl, DemoChainStore };
