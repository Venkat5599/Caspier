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

/** Node kinds the graph engine understands. */
export type NodeKind = "trigger" | "http" | "condition" | "onchain" | "delay" | "transform" | "loop";

/**
 * A node in a workflow graph. `config` is kind-specific and is resolved against
 * the run context ({{input.x}}, {{nodes.id.output.y}}) immediately before the
 * node executes.
 */
export type WfNode = {
  id: string;
  kind: NodeKind;
  label?: string;
  /** Canvas coordinates. Presentation only — execution order comes from edges. */
  position?: { x: number; y: number };
  /** Re-run on failure. `max` counts retries, not total attempts. */
  retry?: { max: number; backoffMs?: number };
  timeoutMs?: number;
  config?: Record<string, unknown>;
};

/**
 * A directed connection. `branch` is set only on edges leaving a condition node:
 * "true" fires when the comparison passes, "false" when it fails. An unbranched
 * edge out of a condition fires on pass, which is what the old flat step list
 * did when it halted on a failed condition.
 */
export type WfEdge = { from: string; to: string; branch?: "true" | "false" };

export type WorkflowGraph = { nodes: WfNode[]; edges: WfEdge[] };

export type WorkflowRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_public: boolean;
  input_variables: { name: string; required?: boolean; description?: string }[];
  /** Legacy flat form. Still accepted; converted to a linear graph on load. */
  steps: WfStep[];
  /** Graph form. When present it wins over `steps`. */
  graph?: WorkflowGraph;
  output_mapping: { name?: string; from?: string }[];
  allowed_contracts: string[];
  tags: string[];
};

export type PaymentProof = { nonce: string; deployHash?: string; payer?: string };
