export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

/** Minimal Ethereum JSON-RPC client (ethers-compatible, works on Bun/Node everywhere). */
export class EvmRpc {
  constructor(private readonly url: string) {}

  async call<T>(method: string, params: unknown): Promise<T> {
    const body: JsonRpcRequest = { jsonrpc: "2.0", id: Date.now(), method, params };
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const json = (await res.json()) as JsonRpcResponse<T>;
    if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
    if (json.result === undefined) throw new Error(`RPC ${method}: empty result`);
    return json.result;
  }

  getTransactionReceipt(txHash: string): Promise<EvmTxReceipt | null> {
    return this.call("eth_getTransactionReceipt", [txHash]);
  }

  /** The transaction itself. A receipt carries no `value`, so a native transfer needs this. */
  getTransactionByHash(txHash: string): Promise<EvmTransaction | null> {
    return this.call("eth_getTransactionByHash", [txHash]);
  }

  /** Account balance in wei for an EVM address (0x…). */
  async getBalanceWei(address: string): Promise<string> {
    const hex = await this.call<string>("eth_getBalance", [address, "latest"]);
    return BigInt(hex).toString();
  }
}

export interface EvmTxReceipt {
  transactionHash: string;
  from: string;
  to?: string;
  value?: string;
  status?: string;
}

export interface EvmTransaction {
  hash: string;
  from: string;
  to?: string;
  value?: string;
}

export function txSucceeded(receipt: EvmTxReceipt | null): boolean {
  return receipt?.status === "0x1";
}

/**
 * Extract native ETH transfer details.
 *
 * The receipt is authoritative for sender/recipient/status but never carries the
 * transferred `value` — that lives on the transaction. Pass `tx` for a real chain;
 * without it the amount can only fall back to the receipt and will read as "0".
 */
export function extractTransfer(
  receipt: EvmTxReceipt | null,
  tx?: EvmTransaction | null,
): {
  senderAccount: string;
  amountWei: string;
  recipientAccount?: string;
} | null {
  if (!receipt?.to) return null;
  const rawValue = tx?.value ?? receipt.value;
  return {
    senderAccount: receipt.from,
    amountWei: rawValue ? BigInt(rawValue).toString() : "0",
    recipientAccount: receipt.to,
  };
}
