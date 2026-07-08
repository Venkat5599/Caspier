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

export type FabricApiRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  payment_address: string | null;
  target_url: string;
  http_method: string;
  content_type: string;
  query_params: string | null;
  example_response: string | null;
  price: string;
  is_public: boolean;
  variables: { name: string; type: string; in: string; description: string; required: boolean }[];
  auth_headers: { name: string; value: string }[];
  owner_address: string | null;
  request_count: number;
  success_count: number;
  earnings: string;
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
const apis: FabricApiRow[] = [];
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

export function listApis(scope?: string, owner?: string): FabricApiRow[] {
  let rows = apis;
  if (scope === "public") rows = rows.filter((a) => a.is_public);
  if (owner) rows = rows.filter((a) => a.owner_address === owner);
  return rows;
}

export function getApi(slugOrId: string): FabricApiRow | undefined {
  const k = slugOrId.toLowerCase();
  return apis.find((a) => a.slug === k || a.id === slugOrId || a.name.toLowerCase() === k);
}

export function createApi(
  body: Partial<FabricApiRow> & { name: string; target_url: string },
): FabricApiRow {
  const row: FabricApiRow = {
    id: id(),
    name: body.name,
    slug: body.slug ?? slugify(body.name),
    description: body.description ?? null,
    category: body.category ?? null,
    tags: body.tags ?? [],
    payment_address: body.payment_address ?? null,
    target_url: body.target_url,
    http_method: body.http_method ?? "GET",
    content_type: body.content_type ?? "application/json",
    query_params: body.query_params ?? null,
    example_response: body.example_response ?? null,
    price: String(body.price ?? "0"),
    is_public: body.is_public ?? false,
    variables: body.variables ?? [],
    auth_headers: body.auth_headers ?? [],
    owner_address: body.owner_address ?? null,
    request_count: 0,
    success_count: 0,
    earnings: "0",
    created_at: new Date().toISOString(),
  };
  apis.unshift(row);
  return row;
}

export function bumpApiStats(slug: string, ok: boolean, paid: boolean, price: number): void {
  const row = getApi(slug);
  if (!row) return;
  row.request_count += 1;
  if (ok) row.success_count += 1;
  if (paid) row.earnings = String(Number(row.earnings) + price);
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

export function fabricStats(
  skillCount: number,
  owner?: string,
  sessionKeys?: { scope: { maxSpendPerCall: string; expiresAt: string } }[],
): {
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
  const latest = sessionKeys?.[0];
  const cap = latest?.scope.maxSpendPerCall ?? null;
  const spent = String(stats.revenue);
  const remaining =
    cap != null ? String(Math.max(0, Number(cap) - Number(spent))) : null;
  return {
    totals: {
      apis: skillCount + apis.length,
      requests: stats.total,
      success: stats.ok,
      earnings: stats.revenue,
      mcpServers: mcps.length,
      workflows: wf.length,
      successRate,
    },
    session: {
      cap,
      spent,
      remaining,
      expiry: latest?.scope.expiresAt ?? null,
      live: (sessionKeys?.length ?? 0) > 0,
    },
  };
}

export function recentActivity(): { kind: string; name: string; slug: string | null; created_at: string }[] {
  const items = [
    ...apis.map((a) => ({ kind: "api", name: a.name, slug: a.slug, created_at: a.created_at })),
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

const KAIROS_OWNER = "01kairos0000000000000000000000000000000000000000000000000000000000";

/** Public marketplace starters (kage-style demo catalog). */
export function seedMarketplaceTemplates(): {
  apis: FabricApiRow[];
  mcps: McpServerRow[];
  workflows: WorkflowRow[];
} {
  const created = { apis: [] as FabricApiRow[], mcps: [] as McpServerRow[], workflows: [] as WorkflowRow[] };

  if (!apis.some((a) => a.slug === "open-meteo-weather")) {
    created.apis.push(
      createApi({
        name: "Open-Meteo Weather",
        slug: "open-meteo-weather",
        description: "Free weather API proxy — pay per call with x402, settled privately on Nox (WTF track).",
        category: "Data",
        tags: ["weather", "x402", "agents"],
        target_url: "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true",
        http_method: "GET",
        price: "1000",
        is_public: true,
        owner_address: KAIROS_OWNER,
        variables: [
          { name: "lat", type: "number", in: "path", description: "Latitude", required: true },
          { name: "lon", type: "number", in: "path", description: "Longitude", required: true },
        ],
      }),
    );
  }

  if (!apis.some((a) => a.slug === "json-placeholder")) {
    created.apis.push(
      createApi({
        name: "JSON Placeholder",
        slug: "json-placeholder",
        description: "Demo REST proxy for agent integration tests — metered via Kairos gateway.",
        category: "Data",
        tags: ["demo", "rest"],
        target_url: "https://jsonplaceholder.typicode.com/posts/{id}",
        http_method: "GET",
        price: "500",
        is_public: true,
        owner_address: KAIROS_OWNER,
        variables: [{ name: "id", type: "number", in: "path", description: "Post id", required: true }],
      }),
    );
  }

  if (!mcpServers.some((m) => m.slug === "kairos-fabric")) {
    created.mcps.push(
      createMcpServer({
        slug: "kairos-fabric",
        display_name: "Kairos Fabric",
        description: "Official starter MCP — chain status, skills catalog, and public workflow tools for agents.",
        is_public: true,
        owner_address: KAIROS_OWNER,
        tools: [
          "caspier_chain_status",
          "caspier_budget",
          "list_skills",
          "get_skill",
          "fabric_reload",
          "api__open-meteo-weather",
          "api__json-placeholder",
        ],
        workflows: ["pay-if-budget"],
      }),
    );
  }

  const wfCreated = seedBuiltinWorkflows();
  created.workflows.push(...wfCreated);

  if (!workflows.some((w) => w.slug === "agent-api-chain")) {
    created.workflows.push(
      createWorkflow({
        name: "Agent API chain",
        slug: "agent-api-chain",
        description: "Budget gate → HTTP weather fetch — template for multi-step agent flows.",
        is_public: true,
        owner_address: KAIROS_OWNER,
        input_variables: [
          { name: "lat", required: true, description: "Latitude" },
          { name: "lon", required: true, description: "Longitude" },
        ],
        steps: [
          { id: "gate", kind: "condition", left: "{{input.lat}}", op: "!=", right: "" },
          {
            id: "fetch",
            kind: "http",
            method: "GET",
            url: "https://api.open-meteo.com/v1/forecast?latitude={{input.lat}}&longitude={{input.lon}}&current_weather=true",
          },
        ],
        output_mapping: [{ name: "weather", from: "{{steps.fetch.output.body}}" }],
        tags: ["http", "template"],
      }),
    );
  }

  return created;
}
