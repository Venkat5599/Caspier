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

/** Minimal Casper JSON-RPC client (no casper-js-sdk — works on Bun/Node everywhere). */
export class CasperRpc {
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

  getDeploy(deployHash: string): Promise<CasperDeployResult> {
    return this.call("info_get_deploy", { deploy_hash: deployHash });
  }

  putDeploy(deploy: unknown): Promise<{ deploy_hash: string }> {
    return this.call("account_put_deploy", { deploy });
  }

  /** Main purse balance in motes for a public key hex (01…). */
  async getBalanceMotes(publicKeyHex: string): Promise<string> {
    const result = await this.call<{ balance_value?: string; API_version?: string }>("state_get_balance", {
      state_root_hash: null,
      purse_identifier: { main_purse_under_public_key: publicKeyHex },
    });
    return result.balance_value ?? "0";
  }
}

export interface CasperDeployResult {
  deploy: {
    hash: string;
    header: { account: string; chain_name: string };
    payment: unknown;
    session: unknown;
    approvals: { signer: string; signature: string }[];
  };
  execution_results: {
    result: { Success?: unknown; Failure?: { code: number; message: string } };
    transfers?: {
      amount: string;
      from: string;
      to?: string;
      gas: string;
    }[];
  }[];
}

export function deploySucceeded(result: CasperDeployResult): boolean {
  const er = result.execution_results?.[0]?.result;
  return er?.Success !== undefined;
}

/** Extract native transfer details from a processed deploy. */
export function extractTransfer(result: CasperDeployResult): {
  senderAccount: string;
  amountMotes: string;
  recipientAccount?: string;
} | null {
  const transfer = result.execution_results?.[0]?.transfers?.[0];
  if (!transfer) return null;
  return {
    senderAccount: transfer.from,
    amountMotes: transfer.amount,
    recipientAccount: transfer.to,
  };
}
