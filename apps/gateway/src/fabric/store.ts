import type { WorkflowRow } from "@fabric/fabric-core";

export type McpServerRow = {
  id: string;
  slug: string | null;
  display_name: string;
  description: string | null;
  is_public: boolean;
  tools: string[];
  workflows: string[];
  owner_address: string | null;
  created_at: string;
};

export type RequestLogRow = {
  id: string;
  api_slug: string | null;
  api_name: string | null;
  kind: "api" | "workflow" | "skill";
  status: number | null;
  ok: boolean;
  paid: boolean;
  price: number;
  created_at: string;
};

const workflows: WorkflowRow[] = [];
const mcpServers: McpServerRow[] = [];
const logs: RequestLogRow[] = [];

function id(): string {
  return crypto.randomUUID();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function listWorkflows(scope?: string, owner?: string): WorkflowRow[] {
  let rows = workflows;
  if (scope === "public") rows = rows.filter((w) => w.is_public);
  if (owner) rows = rows.filter((w) => (w as WorkflowRow & { owner_address?: string }).owner_address === owner);
  return rows;
}

export function getWorkflow(slugOrId: string): WorkflowRow | undefined {
  const k = slugOrId.toLowerCase();
  return workflows.find((w) => w.slug === k || w.id === slugOrId || w.name.toLowerCase() === k);
}

export function createWorkflow(
  body: Partial<WorkflowRow> & { name: string; owner_address?: string },
): WorkflowRow {
  const row: WorkflowRow & { owner_address?: string } = {
    id: id(),
    name: body.name,
    slug: body.slug ?? slugify(body.name),
    description: body.description ?? null,
    is_public: body.is_public ?? false,
    input_variables: body.input_variables ?? [],
    steps: body.steps ?? [],
    output_mapping: body.output_mapping ?? [],
    allowed_contracts: body.allowed_contracts ?? [],
    tags: body.tags ?? [],
    owner_address: body.owner_address,
  };
  workflows.unshift(row);
  return row;
}

export function listMcpServers(scope?: string, owner?: string): McpServerRow[] {
  let rows = mcpServers;
  if (scope === "public") rows = rows.filter((s) => s.is_public);
  if (owner) rows = rows.filter((s) => s.owner_address === owner);
  return rows;
}

export function getMcpServer(slug: string): McpServerRow | undefined {
  const k = slug.toLowerCase();
  return mcpServers.find((s) => s.slug === k || s.id === slug);
}

export function createMcpServer(body: {
  slug?: string;
  display_name: string;
  description?: string;
  is_public?: boolean;
  tools?: string[];
  workflows?: string[];
  owner_address?: string;
}): McpServerRow {
  const row: McpServerRow = {
    id: id(),
    slug: body.slug ?? slugify(body.display_name),
    display_name: body.display_name,
    description: body.description ?? null,
    is_public: body.is_public ?? false,
    tools: body.tools ?? ["caspier_chain_status", "caspier_budget", "list_skills"],
    workflows: body.workflows ?? [],
    owner_address: body.owner_address ?? null,
    created_at: new Date().toISOString(),
  };
  mcpServers.unshift(row);
  return row;
}

export function patchMcpServer(slug: string, patch: Partial<Pick<McpServerRow, "tools" | "workflows">>): McpServerRow | undefined {
  const row = getMcpServer(slug);
  if (!row) return undefined;
  if (patch.tools) row.tools = patch.tools;
  if (patch.workflows) row.workflows = patch.workflows;
  return row;
}

export function appendLog(entry: Omit<RequestLogRow, "id" | "created_at">): RequestLogRow {
  const row: RequestLogRow = { ...entry, id: id(), created_at: new Date().toISOString() };
  logs.unshift(row);
  if (logs.length > 500) logs.length = 500;
  return row;
}

export function listLogs(period?: string): { logs: RequestLogRow[]; stats: { total: number; ok: number; paid: number; revenue: number } } {
  const now = Date.now();
  const cutoff =
    period === "7d" ? now - 7 * 86_400_000 : period === "30d" ? now - 30 * 86_400_000 : 0;
  const filtered = cutoff ? logs.filter((l) => new Date(l.created_at).getTime() >= cutoff) : logs;
  const stats = {
    total: filtered.length,
    ok: filtered.filter((l) => l.ok).length,
    paid: filtered.filter((l) => l.paid).length,
    revenue: filtered.filter((l) => l.paid).reduce((s, l) => s + l.price, 0),
  };
  return { logs: filtered.slice(0, 50), stats };
}

export function fabricStats(skillCount: number, owner?: string): {
  totals: {
    apis: number;
    requests: number;
    success: number;
    earnings: number;
    mcpServers: number;
    workflows: number;
    successRate: number;
  };
  session: { cap: string | null; spent: string | null; remaining: string | null; expiry: string | null; live: boolean };
} {
  const wf = listWorkflows(undefined, owner);
  const mcps = listMcpServers(undefined, owner);
  const { stats } = listLogs("all");
  const successRate = stats.total ? Math.round((stats.ok / stats.total) * 100) : 100;
  return {
    totals: {
      apis: skillCount,
      requests: stats.total,
      success: stats.ok,
      earnings: stats.revenue,
      mcpServers: mcps.length,
      workflows: wf.length,
      successRate,
    },
    session: { cap: null, spent: null, remaining: null, expiry: null, live: false },
  };
}

export function recentActivity(): { kind: string; name: string; slug: string | null; created_at: string }[] {
  const items = [
    ...workflows.map((w) => ({ kind: "workflow", name: w.name, slug: w.slug, created_at: new Date().toISOString() })),
    ...mcpServers.map((m) => ({ kind: "mcp", name: m.display_name, slug: m.slug, created_at: m.created_at })),
  ];
  return items.slice(0, 20);
}

export function seedBuiltinWorkflows(): WorkflowRow[] {
  if (workflows.some((w) => w.slug === "pay-if-budget")) return [];
  const wf = createWorkflow({
    name: "Pay if budget",
    slug: "pay-if-budget",
    description: "Budget gate then Casper transfer — flagship fabric workflow.",
    is_public: true,
    input_variables: [
      { name: "recipient", required: true, description: "Casper account public key hex" },
      { name: "amount", required: true, description: "Amount in motes" },
    ],
    steps: [
      { id: "gate", kind: "condition", left: "{{input.amount}}", op: "<=", right: "5000000000" },
      { id: "settle", kind: "onchain", action: "casper_transfer", recipient: "{{input.recipient}}", amount: "{{input.amount}}" },
    ],
    output_mapping: [{ name: "deployHash", from: "{{steps.settle.output.deployHash}}" }],
    tags: ["onchain", "x402"],
  });
  return [wf];
}
