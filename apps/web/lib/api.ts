const BASE = (process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export interface SkillSummary {
  id: string;
  slug: string;
  version: string;
  name: string;
  description: string;
  pricePerCall: string;
  asset: string;
  createdAt: string;
}

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  runtime: "llm" | "code" | "hybrid";
  pricing: { pricePerCall: string; asset: string };
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  tools?: string[];
  scope: { egress: string[]; contracts?: string[]; maxSpendPerCall?: string };
}

export interface SkillDetail {
  id: string;
  slug: string;
  version: string;
  manifest: SkillManifest;
  body: string;
  createdAt: string;
}

export interface ChainStatus {
  configured: boolean;
  demoMode: boolean;
  network: string;
  publicKeyHex: string | null;
  explorerBase: string;
}

export interface InvokeResult {
  result: unknown;
  payment?: { deployHash: string; demo: boolean; explorerUrl?: string };
  usage?: unknown;
  runtimeMs?: number;
}

export interface X402Quote {
  x402: true;
  price: string;
  asset: string;
  recipient: string;
  nonce: string;
  expiresAt: string;
  slug: string;
}

export interface PublishError {
  error: string;
  code?: string;
  details?: string[];
}

export async function listSkills(): Promise<SkillSummary[]> {
  const res = await fetch(`${BASE}/skills`);
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const body = (await res.json()) as { skills: SkillSummary[] };
  return body.skills;
}

export async function getSkill(slug: string, version?: string): Promise<SkillDetail> {
  const q = version ? `?version=${encodeURIComponent(version)}` : "";
  const res = await fetch(`${BASE}/skills/${encodeURIComponent(slug)}${q}`);
  if (!res.ok) throw new Error(`get failed: ${res.status}`);
  return (await res.json()) as SkillDetail;
}

export async function publishSkill(source: string) {
  const res = await fetch(`${BASE}/skills`, {
    method: "POST",
    headers: { "content-type": "text/markdown" },
    body: source,
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body as { id: string; slug: string; version: string };
}

export async function getChainStatus(): Promise<ChainStatus> {
  const res = await fetch(`${BASE}/chain/status`);
  if (!res.ok) throw new Error("chain status failed");
  return (await res.json()) as ChainStatus;
}

export async function invokeSkill(slug: string, input: unknown) {
  const res = await fetch(`${BASE}/s/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return { status: res.status, body: await res.json() };
}

export async function autoPayInvoke(slug: string, input: unknown, nonce: string): Promise<InvokeResult> {
  const res = await fetch(`${BASE}/s/${encodeURIComponent(slug)}/auto-pay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nonce, input }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error ?? "invoke failed");
  return body as InvokeResult;
}

export interface WorkflowSummary {
  id: number | string;
  name: string;
  active?: boolean;
}

export interface WorkflowNode {
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
  position?: number[];
}

export interface WorkflowDetail {
  id?: number | string;
  name: string;
  active?: boolean;
  nodes?: WorkflowNode[];
  connections?: Record<string, unknown>;
}

export async function seedWorkflows() {
  const res = await fetch(`${BASE}/workflows/seed`, { method: "POST" });
  return res.json();
}

export async function listWorkflows() {
  const res = await fetch(`${BASE}/workflows`);
  return (await res.json()) as { workflows: WorkflowSummary[] };
}

export async function getWorkflow(id: number | string): Promise<WorkflowDetail> {
  const res = await fetch(`${BASE}/workflows/${encodeURIComponent(String(id))}`);
  if (!res.ok) throw new Error(`workflow fetch failed: ${res.status}`);
  return (await res.json()) as WorkflowDetail;
}

export async function generateWorkflow(prompt: string) {
  const res = await fetch(`${BASE}/workflows/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error ?? "generate failed");
  return body as WorkflowDetail & { id: number | string };
}

export const gatewayUrl = BASE;

// --- Fabric (kage-parity) ---

export interface FabricApi {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  payment_address: string | null;
  target_url: string;
  http_method: string;
  content_type?: string;
  query_params?: string | null;
  example_response?: string | null;
  price: string;
  is_public: boolean;
  variables?: { name: string; type: string; in: string; description: string; required: boolean }[];
  auth_headers?: { name: string; value: string }[];
  owner_address: string | null;
  request_count: number;
  success_count?: number;
  earnings?: string;
  created_at?: string;
}

export async function listFabricApis(owner?: string): Promise<FabricApi[]> {
  const q = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  const res = await fetch(`${BASE}/fabric/apis${q}`);
  if (!res.ok) throw new Error(`apis failed: ${res.status}`);
  return ((await res.json()) as { apis: FabricApi[] }).apis;
}

export async function listFabricApisPublic(): Promise<FabricApi[]> {
  const res = await fetch(`${BASE}/fabric/apis?scope=public`);
  if (!res.ok) throw new Error(`apis failed: ${res.status}`);
  return ((await res.json()) as { apis: FabricApi[] }).apis;
}

export async function createFabricApi(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/fabric/apis`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !(data as { ok?: boolean }).ok) throw new Error((data as { error?: string }).error ?? "create failed");
  return data;
}

export interface FabricWorkflow {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_public: boolean;
  input_variables: { name: string; type?: string; required?: boolean; description?: string }[];
  steps: unknown[];
  output_mapping?: { name: string; from: string }[];
  allowed_contracts?: string[];
  tags: string[];
}

export interface FabricMcpServer {
  id: string;
  slug: string | null;
  display_name: string;
  description: string | null;
  is_public: boolean;
  tools: string[];
  workflows: string[];
  owner_address: string | null;
  created_at: string;
}

export interface FabricStats {
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
}

export async function listFabricWorkflows(scope?: string): Promise<FabricWorkflow[]> {
  const q = scope ? `?scope=${scope}` : "";
  const res = await fetch(`${BASE}/fabric/workflows${q}`);
  if (!res.ok) throw new Error(`workflows failed: ${res.status}`);
  return ((await res.json()) as { workflows: FabricWorkflow[] }).workflows;
}

export async function createFabricWorkflow(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/fabric/workflows`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "create failed");
  return data;
}

export async function seedFabricWorkflows() {
  const res = await fetch(`${BASE}/fabric/workflows/seed`, { method: "POST" });
  return res.json();
}

export async function seedFabricMarketplace() {
  const res = await fetch(`${BASE}/fabric/marketplace/seed`, { method: "POST" });
  return res.json();
}

export async function runFabricWorkflow(slug: string, input: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/fabric/run/workflow`, {
    method: "POST",
    headers,
    body: JSON.stringify({ slug, input }),
  });
  return res.json();
}

export async function runFabricApi(slug: string, args: Record<string, unknown>) {
  const res = await fetch(`${BASE}/fabric/run/api`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, args }),
  });
  return res.json();
}

export async function listFabricMcpServers(scope?: string): Promise<FabricMcpServer[]> {
  const q = scope ? `?scope=${scope}` : "";
  const res = await fetch(`${BASE}/fabric/mcp-servers${q}`);
  if (!res.ok) throw new Error(`mcp list failed: ${res.status}`);
  return ((await res.json()) as { servers: FabricMcpServer[] }).servers;
}

export async function createFabricMcpServer(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/fabric/mcp-servers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "create failed");
  return data;
}

export async function patchFabricMcpServer(slug: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/fabric/mcp-servers/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getFabricStats(owner?: string): Promise<FabricStats> {
  const q = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  const res = await fetch(`${BASE}/fabric/stats${q}`);
  if (!res.ok) throw new Error("stats failed");
  return (await res.json()) as FabricStats;
}

export async function getFabricActivity() {
  const res = await fetch(`${BASE}/fabric/activity`);
  if (!res.ok) return [];
  return ((await res.json()) as { activity: unknown[] }).activity ?? [];
}

export async function getFabricLogs(period: string) {
  const res = await fetch(`${BASE}/fabric/logs?period=${period}`);
  if (!res.ok) return { logs: [], stats: null };
  return (await res.json()) as { logs: unknown[]; stats: { total: number; ok: number; paid: number; revenue: number } };
}

export async function provisionFabricSession(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/fabric/provision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getFabricWalletStatus(address: string) {
  const res = await fetch(`${BASE}/fabric/wallet-status?address=${encodeURIComponent(address)}`);
  return res.json() as Promise<{ ok: boolean; funded?: boolean; ETH?: string; wei?: string; demo?: boolean; error?: string }>;
}

export const fabricMcpUrl = process.env.NEXT_PUBLIC_FABRIC_MCP_URL ?? "http://localhost:8403";
