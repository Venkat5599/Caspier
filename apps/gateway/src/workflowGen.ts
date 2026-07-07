// AI workflow builder: natural-language prompt -> n8n workflow JSON (themed to
// Agent Fabric) -> created in the self-hosted n8n via its REST API.

const AICREDITS_BASE = process.env.AICREDITS_BASE_URL ?? "https://api.aicredits.in/v1";
const AICREDITS_MODEL = process.env.AICREDITS_MODEL ?? "deepseek/deepseek-v4-flash";
const N8N_REST = (process.env.N8N_REST_URL ?? "http://127.0.0.1:5678").replace(/\/+$/, "");
const GATEWAY_PUBLIC = (process.env.GATEWAY_PUBLIC_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, "");

const SYSTEM_PROMPT = `You are a workflow generator for Agent Fabric — a permissioned execution layer on the Casper blockchain where AI agents call paid "skills" (APIs) metered per call via the x402 protocol, bounded by scoped Casper session keys.

You output ONE n8n workflow as JSON. EVERYTHING must relate to Agent Fabric / blockchain: x402 payments, Casper session keys, agent skill calls, on-chain settlement, usage metering. Never generic business automations.

Rules:
- Output ONLY raw JSON. No markdown, no prose, no code fences.
- Use n8n 0.148 node types ONLY: "n8n-nodes-base.start", "n8n-nodes-base.cron", "n8n-nodes-base.webhook", "n8n-nodes-base.httpRequest", "n8n-nodes-base.if", "n8n-nodes-base.set", "n8n-nodes-base.function", "n8n-nodes-base.noOp".
- Skill/API calls use httpRequest with url like "${GATEWAY_PUBLIC}/s/<skill-name>" and requestMethod "POST".
- For x402 flows, follow with POST "${GATEWAY_PUBLIC}/s/<skill-name>/auto-pay" body { nonce, input }.
- Lay nodes left-to-right: position x = 220 + 230*index, y around 300 (branch up/down to 200/420).
- Each node: {"parameters":{...},"name":"...","type":"...","typeVersion":1,"position":[x,y]}.
- "connections" maps each source node NAME to {"main":[[{"node":"<target name>","type":"main","index":0}]]}. IF nodes have two outputs: [[true...],[false...]].
- Top-level shape EXACTLY: {"name": string, "nodes": [...], "connections": {...}, "active": false, "settings": {}, "tags": []}.
- Name the workflow with an "x402 ·" or "Casper ·" or "Agent ·" prefix.
- Keep it 3-6 nodes, valid and connected.`;

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

async function callLLM(prompt: string): Promise<string> {
  const key = process.env.AICREDITS_API_KEY;
  if (!key) throw new Error("AICREDITS_API_KEY not set");
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];
  const res = await fetch(`${AICREDITS_BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: AICREDITS_MODEL, messages, temperature: 0.4 }),
  });
  if (!res.ok) {
    throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("LLM returned no content");
  return text;
}

/** Extract a JSON object from a model response (strips fences/prose). */
function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1]!.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in model output");
  return JSON.parse(t.slice(start, end + 1));
}

interface N8nWorkflow {
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  active: boolean;
  settings: Record<string, unknown>;
  tags: unknown[];
}

/** Normalize the model output into a valid n8n create payload. */
function normalize(raw: unknown): N8nWorkflow {
  if (typeof raw !== "object" || raw === null) throw new Error("workflow is not an object");
  const w = raw as Record<string, unknown>;
  if (typeof w.name !== "string" || !Array.isArray(w.nodes) || w.nodes.length === 0) {
    throw new Error("workflow missing name or nodes");
  }
  return {
    name: w.name,
    nodes: w.nodes,
    connections: (w.connections as Record<string, unknown>) ?? {},
    active: false,
    settings: (w.settings as Record<string, unknown>) ?? {},
    tags: [], // n8n 0.148 requires tags to exist (it .slice()s it)
  };
}

export interface GenerateResult {
  id: number | string;
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  active: boolean;
}

/** Generate a themed workflow from a prompt and create it in n8n. */
export async function generateWorkflow(prompt: string): Promise<GenerateResult> {
  const text = await callLLM(prompt);
  const workflow = normalize(extractJson(text));

  const res = await fetch(`${N8N_REST}/rest/workflows`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(workflow),
  });
  if (!res.ok) {
    throw new Error(`n8n create ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const created = (await res.json()) as { data?: { id?: number | string; name?: string } };
  const id = created.data?.id;
  if (id === undefined) throw new Error("n8n did not return a workflow id");
  return {
    id,
    name: created.data?.name ?? workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    active: workflow.active,
  };
}
