// @fabric/nox-chain — confidential settlement layer over iExec Nox.
//
// Wraps KairosAgentVault so the gateway can fund an encrypted budget, register
// agents with encrypted per-call caps, and settle payments whose amounts never
// appear on-chain in plaintext.
//
// Fail-closed by design: if the Nox gateway or the vault is unreachable, every
// authorization check returns false rather than defaulting to "allowed".
import { Contract, JsonRpcProvider, Wallet, type Signer } from "ethers";
import { createEthersHandleClient } from "@iexec-nox/handle";

/** 0x-prefixed hex, the shape both ethers and the Nox handle SDK expect. */
export type Hex = `0x${string}`;

function asHex(value: string, label: string): Hex {
  if (!/^0x[0-9a-fA-F]*$/.test(value)) {
    throw new Error(`${label} must be 0x-prefixed hex, got: ${value.slice(0, 12)}…`);
  }
  return value as Hex;
}

// --- Config ---------------------------------------------------------------

export interface NoxConfig {
  rpcUrl: string;
  chainId: number;
  vaultAddress: Hex | null;
  privateKey: string | null;
}

export function loadNoxConfig(): NoxConfig {
  const vault = process.env.VAULT_CONTRACT_ADDRESS;
  return {
    rpcUrl: process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
    chainId: Number(process.env.SEPOLIA_CHAIN_ID ?? "11155111"),
    vaultAddress: vault ? asHex(vault, "VAULT_CONTRACT_ADDRESS") : null,
    privateKey:
      process.env.CHAIN_WORKER_SECRET_KEY ?? process.env.DEPLOYER_PRIVATE_KEY ?? null,
  };
}

export function isNoxConfigured(config: NoxConfig = loadNoxConfig()): boolean {
  return Boolean(config.vaultAddress && config.privateKey);
}

// --- ABI ------------------------------------------------------------------
// euint256 / ebool / externalEuint256 are user-defined value types over
// bytes32, so they cross the ABI boundary as bytes32.

export const VAULT_ABI = [
  "function owner() view returns (address)",
  "function fund(bytes32 inputHandle, bytes inputProof)",
  "function registerAgent(address agent, bytes32 capHandle_, bytes capProof)",
  "function settle(address recipient, bytes32 amountHandle, bytes amountProof)",
  "function revokeAgent(address agent)",
  "function flushEpoch()",
  "function epoch() view returns (uint256)",
  "function epochCount() view returns (uint256)",
  "function budgetHandle() view returns (bytes32)",
  "function epochTotalHandle() view returns (bytes32)",
  "function spentHandle(address agent) view returns (bytes32)",
  "function capHandle(address agent) view returns (bytes32)",
  "function lastSettlementOkHandle(address agent) view returns (bytes32)",
  "function isActive(address agent) view returns (bool)",
  "event BudgetFunded(address indexed owner)",
  "event AgentRegistered(address indexed agent)",
  "event AgentRevoked(address indexed agent)",
  // No addresses and no amount — only the epoch. See KairosAgentVault docs.
  "event PrivateSettlement(uint256 indexed epoch)",
  "event EpochSettled(uint256 indexed epoch, uint256 count)",
] as const;

interface TxResponse {
  hash: string;
  wait(): Promise<{ blockNumber?: number } | null>;
}

/** Typed view of the vault. ethers' dynamic accessors are untyped, so the
 *  Contract is narrowed to this once at construction. */
interface VaultMethods {
  fund(handle: Hex, proof: Hex): Promise<TxResponse>;
  registerAgent(agent: string, handle: Hex, proof: Hex): Promise<TxResponse>;
  settle(recipient: string, handle: Hex, proof: Hex): Promise<TxResponse>;
  revokeAgent(agent: string): Promise<TxResponse>;
  flushEpoch(): Promise<TxResponse>;
  epoch(): Promise<bigint>;
  epochCount(): Promise<bigint>;
  budgetHandle(): Promise<Hex>;
  epochTotalHandle(): Promise<Hex>;
  spentHandle(agent: string): Promise<Hex>;
  capHandle(agent: string): Promise<Hex>;
  lastSettlementOkHandle(agent: string): Promise<Hex>;
  isActive(agent: string): Promise<boolean>;
}

// --- Types ----------------------------------------------------------------

export interface TxReceiptSummary {
  txHash: string;
  explorerUrl: string;
  blockNumber: number | null;
}

export interface SettlementResult extends TxReceiptSummary {
  /** Decrypted authorization outcome — true only if within cap and funded. */
  authorized: boolean;
  /** Agent's decrypted cumulative spend after this settlement. */
  spentWei: bigint;
}

const EXPLORER = process.env.SEPOLIA_EXPLORER_BASE ?? "https://sepolia.etherscan.io/tx/";

function explorerUrl(txHash: string): string {
  return `${EXPLORER.replace(/\/+$/, "")}/${txHash}`;
}

/**
 * Nox computes handles asynchronously in the TEE *after* the transaction is
 * mined, and the handle's ACL only exists once that compute lands. Reading
 * immediately therefore fails with "not a viewer" or NotYetComputedHandleError
 * even though the contract behaved correctly.
 *
 * Retries with linear backoff so callers see the settled value rather than a
 * spurious permission error.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 6, baseMs = 2_000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, baseMs * attempt));
      }
    }
  }
  throw lastError;
}

// --- Client ---------------------------------------------------------------

type HandleClient = Awaited<ReturnType<typeof createEthersHandleClient>>;

/**
 * Confidential vault client. One instance per signer — the signer identity
 * decides which encrypted handles are decryptable (owner vs agent ACL).
 */
export class NoxVaultClient {
  private constructor(
    readonly config: NoxConfig,
    readonly vaultAddress: Hex,
    private readonly signer: Signer,
    private readonly handles: HandleClient,
    private readonly vault: VaultMethods,
  ) {}

  static async create(config: NoxConfig = loadNoxConfig()): Promise<NoxVaultClient> {
    if (!config.vaultAddress) {
      throw new Error("VAULT_CONTRACT_ADDRESS not set — deploy KairosAgentVault first");
    }
    if (!config.privateKey) {
      throw new Error("CHAIN_WORKER_SECRET_KEY not set — cannot sign Nox transactions");
    }
    const provider = new JsonRpcProvider(config.rpcUrl, config.chainId);
    const signer = new Wallet(config.privateKey, provider);
    const handles = await createEthersHandleClient(signer);
    const vault = new Contract(
      config.vaultAddress,
      VAULT_ABI,
      signer,
    ) as unknown as VaultMethods;
    return new NoxVaultClient(config, config.vaultAddress, signer, handles, vault);
  }

  /** Address of the signer driving this client (owner or agent). */
  signerAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  /** Encrypt a wei amount bound to the vault contract. */
  private encrypt(amountWei: bigint) {
    return this.handles.encryptInput(amountWei, "uint256", this.vaultAddress);
  }

  private async send(txPromise: Promise<TxResponse>): Promise<TxReceiptSummary> {
    const tx = await txPromise;
    const receipt = await tx.wait();
    return {
      txHash: tx.hash,
      explorerUrl: explorerUrl(tx.hash),
      blockNumber: receipt?.blockNumber ?? null,
    };
  }

  /** Owner: add an encrypted amount to the confidential budget. */
  async fund(amountWei: bigint): Promise<TxReceiptSummary> {
    const { handle, handleProof } = await this.encrypt(amountWei);
    return this.send(this.vault.fund(handle, handleProof));
  }

  /** Owner: register an agent with an encrypted per-call cap. */
  async registerAgent(agent: string, capWei: bigint): Promise<TxReceiptSummary> {
    const { handle, handleProof } = await this.encrypt(capWei);
    return this.send(this.vault.registerAgent(agent, handle, handleProof));
  }

  /** Owner: revoke an agent's session in one transaction. */
  async revokeAgent(agent: string): Promise<TxReceiptSummary> {
    return this.send(this.vault.revokeAgent(agent));
  }

  /**
   * Owner: close the current batching epoch.
   *
   * Individual settlements never move funds on their own — they accumulate
   * into an encrypted epoch total. Flushing emits one aggregate event, so an
   * observer cannot map transactions to individual API calls.
   */
  async flushEpoch(): Promise<TxReceiptSummary> {
    return this.send(this.vault.flushEpoch());
  }

  /** Current epoch number and how many settlements it has absorbed. */
  async epochStatus(): Promise<{ epoch: bigint; count: bigint }> {
    const [epoch, count] = await Promise.all([this.vault.epoch(), this.vault.epochCount()]);
    return { epoch, count };
  }

  /** Owner-only: encrypted total debited in the current epoch. */
  async readEpochTotal(): Promise<bigint> {
    return this.decryptUint(await this.vault.epochTotalHandle());
  }

  /**
   * Agent: settle a payment with an encrypted amount, then read back the
   * encrypted authorization flag. The chain never sees the amount, the cap,
   * or the running total.
   */
  async settle(recipient: string, amountWei: bigint): Promise<SettlementResult> {
    const agent = await this.signer.getAddress();
    const { handle, handleProof } = await this.encrypt(amountWei);
    const tx = await this.send(this.vault.settle(recipient, handle, handleProof));

    const [authorized, spentWei] = await Promise.all([
      this.wasLastSettlementAuthorized(agent),
      this.readSpent(agent).catch(() => 0n),
    ]);

    return { ...tx, authorized, spentWei };
  }

  // --- Encrypted reads (require ACL permission on the calling signer) ---

  private async decryptUint(handle: Hex): Promise<bigint> {
    const { value } = await withRetry(() => this.handles.decrypt(handle));
    return BigInt(value as string | bigint);
  }

  /** Owner-only: remaining confidential budget. */
  async readBudget(): Promise<bigint> {
    return this.decryptUint(await this.vault.budgetHandle());
  }

  /** Owner or the agent itself: cumulative confidential spend. */
  async readSpent(agent: string): Promise<bigint> {
    return this.decryptUint(await this.vault.spentHandle(agent));
  }

  /** Owner or the agent itself: encrypted per-call cap. */
  async readCap(agent: string): Promise<bigint> {
    return this.decryptUint(await this.vault.capHandle(agent));
  }

  async isActive(agent: string): Promise<boolean> {
    return this.vault.isActive(agent);
  }

  /**
   * Whether the agent's most recent settlement was authorized.
   *
   * Fail-closed: any decryption or RPC failure returns false, so an
   * unreachable Nox gateway blocks the paid action instead of granting
   * unmetered access.
   */
  async wasLastSettlementAuthorized(agent: string): Promise<boolean> {
    try {
      const handle = await this.vault.lastSettlementOkHandle(agent);
      const { value } = await withRetry(() => this.handles.decrypt(handle));
      return value === true || value === 1n;
    } catch {
      return false;
    }
  }
}
