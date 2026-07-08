import type { WfStep, WorkflowRow, CmpOp } from "./types.ts";
import type { CatalogLoader } from "./catalog.ts";
import { invokeSkillViaGateway } from "./proxy-tool.ts";
import { currentScope } from "./auth.ts";
import { resolve, type RunCtx } from "./resolver.ts";

export type StepResult = {
  id: string;
  kind: string;
  status: "ok" | "skipped" | "error";
  detail?: string;
  output?: unknown;
  halt?: boolean;
};

export type WorkflowRunnerDeps = {
  catalog: CatalogLoader;
  gatewayUrl: string;
  transfer?: (recipient: string, amountWei: string) => Promise<{ deployHash: string; demo: boolean }>;
  fetchImpl?: typeof fetch;
};

async function runHttp(step: Extract<WfStep, { kind: "http" }>, deps: WorkflowRunnerDeps): Promise<StepResult> {
  if (step.api) {
    const res = await invokeSkillViaGateway(
      deps.gatewayUrl,
      step.api,
      (step.with ?? {}) as Record<string, unknown>,
      undefined,
      deps.fetchImpl,
    );
    const ok = res.status >= 200 && res.status < 300;
    return {
      id: step.id,
      kind: "http",
      status: ok ? "ok" : "error",
      detail: `${step.api} -> ${res.status}`,
      output: res.body,
    };
  }
  if (step.url) {
    const method = (step.method ?? "GET").toUpperCase();
    const init: RequestInit = { method, headers: { accept: "application/json" } };
    if (method !== "GET" && method !== "HEAD" && step.body != null) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = typeof step.body === "string" ? step.body : JSON.stringify(step.body);
    }
    const r = await (deps.fetchImpl ?? fetch)(step.url, init);
    const text = await r.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep text */
    }
    return {
      id: step.id,
      kind: "http",
      status: r.status < 400 ? "ok" : "error",
      detail: `${step.url} -> ${r.status}`,
      output: body,
    };
  }
  return { id: step.id, kind: "http", status: "error", detail: "http step needs api or url" };
}

function compare(left: string, op: CmpOp, right: string): boolean {
  const ln = Number(left);
  const rn = Number(right);
  const numeric = left.trim() !== "" && right.trim() !== "" && !Number.isNaN(ln) && !Number.isNaN(rn);
  if (numeric) {
    const asInt = /^-?\d+$/.test(left.trim()) && /^-?\d+$/.test(right.trim());
    const [l, r] = asInt ? [BigInt(left), BigInt(right)] : [ln, rn];
    switch (op) {
      case ">=": return l >= r;
      case ">": return l > r;
      case "<=": return l <= r;
      case "<": return l < r;
      case "==": return l === r;
      case "!=": return l !== r;
    }
  }
  switch (op) {
    case "==": return left === right;
    case "!=": return left !== right;
    default: throw new Error(`condition: non-numeric operands for '${op}'`);
  }
}

function runCondition(step: Extract<WfStep, { kind: "condition" }>): StepResult {
  const pass = compare(String(step.left), step.op, String(step.right));
  return {
    id: step.id,
    kind: "condition",
    status: pass ? "ok" : "skipped",
    detail: `${step.left} ${step.op} ${step.right} -> ${pass}`,
    halt: !pass,
  };
}

async function runOnchain(
  step: Extract<WfStep, { kind: "onchain" }>,
  wf: WorkflowRow,
  deps: WorkflowRunnerDeps,
): Promise<StepResult> {
  const scope = currentScope();
  const allow = wf.allowed_contracts ?? [];
  if (allow.length > 0 && scope.agentPublicKeyHex && !allow.includes(scope.agentPublicKeyHex)) {
    return { id: step.id, kind: "onchain", status: "error", detail: "recipient not in allowed_contracts" };
  }

  if (!deps.transfer) {
    return { id: step.id, kind: "onchain", status: "error", detail: "chain transfer not configured" };
  }

  try {
    const pay = await deps.transfer(step.recipient, step.amount);
    return {
      id: step.id,
      kind: "onchain",
      status: "ok",
      detail: `transfer ${pay.deployHash}`,
      output: { deployHash: pay.deployHash, demo: pay.demo },
    };
  } catch (e) {
    return { id: step.id, kind: "onchain", status: "error", detail: `transfer failed: ${(e as Error).message}` };
  }
}

export async function runStep(step: WfStep, wf: WorkflowRow, deps: WorkflowRunnerDeps): Promise<StepResult> {
  switch (step.kind) {
    case "http": return runHttp(step, deps);
    case "condition": return runCondition(step);
    case "onchain": return runOnchain(step, wf, deps);
    default: return { id: (step as { id?: string }).id ?? "?", kind: "unknown", status: "error", detail: "unknown step kind" };
  }
}

export type WorkflowRun = {
  workflow: string;
  completed: boolean;
  steps: StepResult[];
  output?: Record<string, unknown>;
};

function mapOutput(wf: WorkflowRow, ctx: RunCtx): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const m of wf.output_mapping ?? []) {
    if (!m?.name || m.from == null) continue;
    try {
      out[m.name] = resolve(m.from, ctx);
    } catch {
      out[m.name] = null;
    }
  }
  return out;
}

export async function runWorkflow(
  wf: WorkflowRow,
  input: Record<string, unknown>,
  deps: WorkflowRunnerDeps,
): Promise<WorkflowRun> {
  const ctx: RunCtx = { input, steps: {} };
  const results: StepResult[] = [];

  for (const raw of wf.steps ?? []) {
    let step: WfStep;
    try {
      step = resolve(raw, ctx);
    } catch (e) {
      results.push({
        id: (raw as { id?: string }).id ?? "?",
        kind: (raw as WfStep).kind ?? "?",
        status: "error",
        detail: (e as Error).message,
      });
      return { workflow: wf.slug ?? wf.name, completed: false, steps: results };
    }

    const res = await runStep(step, wf, deps);
    results.push(res);
    ctx.steps[res.id] = { output: res.output };

    if (res.status === "error") return { workflow: wf.slug ?? wf.name, completed: false, steps: results };
    if (res.halt) return { workflow: wf.slug ?? wf.name, completed: false, steps: results };
  }

  return {
    workflow: wf.slug ?? wf.name,
    completed: true,
    steps: results,
    output: mapOutput(wf, ctx),
  };
}
