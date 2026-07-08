// n8n REST client + workflow templates for Agent Fabric.

const N8N_REST = (process.env.N8N_REST_URL ?? "http://127.0.0.1:5678").replace(/\/+$/, "");
const GATEWAY = (process.env.GATEWAY_PUBLIC_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, "");

export interface N8nWorkflow {
  id: number | string;
  name: string;
  active: boolean;
}

export interface N8nCreatePayload {
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  active: boolean;
  settings: Record<string, unknown>;
  tags: unknown[];
}

async function n8nFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${N8N_REST}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`n8n ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

export async function listWorkflows(): Promise<N8nWorkflow[]> {
  const data = (await n8nFetch("/rest/workflows")) as { data?: N8nWorkflow[] };
  return data.data ?? [];
}

export async function getWorkflow(id: number | string): Promise<unknown> {
  const data = (await n8nFetch(`/rest/workflows/${id}`)) as { data?: unknown };
  return data.data;
}

export async function createWorkflow(payload: N8nCreatePayload): Promise<N8nWorkflow> {
  const data = (await n8nFetch("/rest/workflows", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data?: N8nWorkflow };
  if (!data.data?.id) throw new Error("n8n did not return workflow id");
  return data.data;
}

export async function activateWorkflow(id: number | string, active: boolean): Promise<void> {
  await n8nFetch(`/rest/workflows/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

/** Built-in x402 skill-call workflow (works with live gateway). */
export function templateX402SkillCall(slug = "hello-weather"): N8nCreatePayload {
  const url = `${GATEWAY}/s/${slug}`;
  return {
    name: `x402 · Call ${slug}`,
    nodes: [
      { parameters: {}, name: "Start", type: "n8n-nodes-base.start", typeVersion: 1, position: [200, 300] },
      {
        parameters: {
          requestMethod: "POST",
          url,
          jsonParameters: true,
          options: {},
          bodyParametersJson: JSON.stringify({ city: "Oslo" }),
        },
        name: "Call skill (402?)",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [430, 300],
      },
      {
        parameters: {
          conditions: { number: [{ value1: "={{$json.statusCode}}", operation: "equal", value2: 402 }] },
        },
        name: "Payment required?",
        type: "n8n-nodes-base.if",
        typeVersion: 1,
        position: [660, 300],
      },
      {
        parameters: {
          requestMethod: "POST",
          url: `${url}/auto-pay`,
          jsonParameters: true,
          bodyParametersJson: '={{ JSON.stringify({ nonce: $json.body.nonce, input: { city: "Oslo" } }) }}',
        },
        name: "Auto-pay & execute",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [890, 200],
      },
      {
        parameters: { values: { string: [{ name: "result", value: "={{$json.result.summary}}" }] } },
        name: "Extract result",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [1120, 200],
      },
    ],
    connections: {
      Start: { main: [[{ node: "Call skill (402?)", type: "main", index: 0 }]] },
      "Call skill (402?)": { main: [[{ node: "Payment required?", type: "main", index: 0 }]] },
      "Payment required?": {
        main: [[{ node: "Auto-pay & execute", type: "main", index: 0 }], []],
      },
      "Auto-pay & execute": { main: [[{ node: "Extract result", type: "main", index: 0 }]] },
    },
    active: false,
    settings: {},
    tags: [],
  };
}

export function templateSettlementMeter(): N8nCreatePayload {
  return {
    name: "Sepolia · Settlement meter",
    nodes: [
      { parameters: {}, name: "Start", type: "n8n-nodes-base.start", typeVersion: 1, position: [200, 300] },
      {
        parameters: { requestMethod: "GET", url: `${GATEWAY}/payments/usage` },
        name: "Fetch usage ledger",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [430, 300],
      },
      {
        parameters: { requestMethod: "GET", url: `${GATEWAY}/chain/status` },
        name: "Chain status",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [660, 300],
      },
    ],
    connections: {
      Start: { main: [[{ node: "Fetch usage ledger", type: "main", index: 0 }]] },
      "Fetch usage ledger": { main: [[{ node: "Chain status", type: "main", index: 0 }]] },
    },
    active: false,
    settings: {},
    tags: [],
  };
}

export function templateSessionKeyRebalance(): N8nCreatePayload {
  return {
    name: "Sepolia · Session key rebalance",
    nodes: [
      { parameters: {}, name: "Start", type: "n8n-nodes-base.start", typeVersion: 1, position: [200, 300] },
      {
        parameters: { requestMethod: "GET", url: `${GATEWAY}/auth/session-keys` },
        name: "List session keys",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [430, 300],
      },
      {
        parameters: {
          requestMethod: "POST",
          url: `${GATEWAY}/auth/session-keys`,
          jsonParameters: true,
          bodyParametersJson: JSON.stringify({
            agentPublicKeyHex: "01agent000000000000000000000000000000000000000000000000000000000001",
            scope: {
              maxSpendPerCall: "5000000000",
              expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            },
          }),
        },
        name: "Mint scoped key",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [660, 300],
      },
    ],
    connections: {
      Start: { main: [[{ node: "List session keys", type: "main", index: 0 }]] },
      "List session keys": { main: [[{ node: "Mint scoped key", type: "main", index: 0 }]] },
    },
    active: false,
    settings: {},
    tags: [],
  };
}

export const BUILTIN_TEMPLATES = {
  "x402-skill-call": templateX402SkillCall,
  "settlement-meter": templateSettlementMeter,
  "session-key-rebalance": templateSessionKeyRebalance,
} as const;

export async function seedBuiltinWorkflows(): Promise<N8nWorkflow[]> {
  const existing = await listWorkflows().catch(() => [] as N8nWorkflow[]);
  const created: N8nWorkflow[] = [];
  for (const fn of Object.values(BUILTIN_TEMPLATES)) {
    const payload = fn();
    if (existing.some((w) => w.name === payload.name)) continue;
    created.push(await createWorkflow(payload));
  }
  return created;
}

export { N8N_REST, GATEWAY };
