/** Skill row from gateway catalog — exposed as api__{slug} MCP tools. */
export type SkillApiRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  pricePerCall: string;
  asset: string;
  is_public: boolean;
  inputSchema?: Record<string, unknown>;
};

export type CmpOp = ">=" | ">" | "<=" | "<" | "==" | "!=";

export type WfStep =
  | { id: string; kind: "http"; api?: string; url?: string; method?: string; body?: unknown; with?: Record<string, unknown> }
  | { id: string; kind: "onchain"; action?: "vault_settle" | "eth_transfer"; recipient: string; amount: string }
  | { id: string; kind: "condition"; left: string; op: CmpOp; right: string };

export type WorkflowRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_public: boolean;
  input_variables: { name: string; required?: boolean; description?: string }[];
  steps: WfStep[];
  output_mapping: { name?: string; from?: string }[];
  allowed_contracts: string[];
  tags: string[];
};

export type PaymentProof = { nonce: string; deployHash?: string; payer?: string };
