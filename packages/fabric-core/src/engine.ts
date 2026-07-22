import type { WfNode, WfStep, WorkflowGraph, WorkflowRow } from "./types.ts";
import { workflowGraph } from "./graph.ts";
import { resolve, type RunCtx } from "./resolver.ts";
import { runStep, type StepResult, type WorkflowRunnerDeps } from "./steps.ts";

export type NodeStatus = "ok" | "skipped" | "error";

export type NodeResult = {
  id: string;
  kind: string;
  status: NodeStatus;
  /** How many times the node ran. 1 means it succeeded without retrying. */
  attempts: number;
  detail?: string;
  output?: unknown;
  startedAt?: string;
  durationMs?: number;
  halt?: boolean;
};

export type GraphRun = {
  id: string;
  workflow: string;
  /** completed = every reachable node finished without error. */
  completed: boolean;
  status: "completed" | "failed" | "halted";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  nodes: NodeResult[];
  /** Legacy alias so existing API consumers keep reading `run.steps`. */
  steps: StepResult[];
  output?: Record<string, unknown>;
  error?: string;
};

/** Guards against a runaway graph regardless of how it was authored. */
const MAX_NODE_EXECUTIONS = 500;
const MAX_LOOP_ITEMS = 100;

function nodeToStep(node: WfNode): WfStep {
  return { id: node.id, kind: node.kind, ...(node.config ?? {}) } as WfStep;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function withTimeout<T>(p: Promise<T>, ms: number | undefined, label: string): Promise<T> {
  if (!ms || ms <= 0) return p;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Node kinds the graph engine owns outright, rather than delegating to the
 * shared step runners in steps.ts. Returns null when the kind is not native.
 */
async function runNativeNode(
  node: WfNode,
  ctx: RunCtx,
  deps: WorkflowRunnerDeps,
): Promise<StepResult | null> {
  const cfg = (node.config ?? {}) as Record<string, unknown>;

  if (node.kind === "trigger") {
    return { id: node.id, kind: "trigger", status: "ok", detail: "run started", output: ctx.input };
  }

  if (node.kind === "delay") {
    const ms = Math.max(0, Number(cfg.ms ?? 0));
    await sleep(ms);
    return { id: node.id, kind: "delay", status: "ok", detail: `waited ${ms}ms`, output: { ms } };
  }

  if (node.kind === "transform") {
    // `value` arrives already resolved, so this just names the result.
    return { id: node.id, kind: "transform", status: "ok", detail: "mapped", output: cfg.value };
  }

  if (node.kind === "loop") {
    const over = cfg.over;
    if (!Array.isArray(over)) {
      return { id: node.id, kind: "loop", status: "error", detail: "loop 'over' did not resolve to an array" };
    }
    const items = over.slice(0, MAX_LOOP_ITEMS);
    const body = (cfg.body ?? []) as WfStep[];
    const outputs: unknown[] = [];

    for (const [i, item] of items.entries()) {
      const itemCtx: RunCtx = { input: ctx.input, steps: { ...ctx.steps, item: { output: item } } };
      for (const rawInner of body) {
        const inner = resolve(rawInner, itemCtx);
        const res = await runStep(inner, { allowed_contracts: [] } as unknown as WorkflowRow, deps);
        itemCtx.steps[res.id] = { output: res.output };
        if (res.status === "error") {
          return {
            id: node.id,
            kind: "loop",
            status: "error",
            detail: `item ${i}: ${res.detail ?? "failed"}`,
            output: outputs,
          };
        }
      }
      outputs.push(Object.fromEntries(Object.entries(itemCtx.steps).map(([k, v]) => [k, v.output])));
    }

    return { id: node.id, kind: "loop", status: "ok", detail: `${items.length} item(s)`, output: outputs };
  }

  return null;
}

/**
 * Resolve a node's config against the run context, holding back the parts that
 * must stay templated. A loop body references {{steps.item.…}}, which is only
 * bound per iteration — resolving it here would throw on the unknown path.
 */
function resolveConfig(node: WfNode, ctx: RunCtx): Record<string, unknown> {
  const cfg = node.config ?? {};
  if (node.kind !== "loop") return resolve(cfg, ctx);
  const { body, ...rest } = cfg as Record<string, unknown>;
  return { ...resolve(rest, ctx), body };
}

/** Execute one node, honouring retry/backoff and timeout. */
async function executeNode(
  node: WfNode,
  wf: WorkflowRow,
  ctx: RunCtx,
  deps: WorkflowRunnerDeps,
): Promise<NodeResult> {
  const startedAt = new Date().toISOString();
  const began = Date.now();
  const maxRetries = Math.max(0, Number(node.retry?.max ?? 0));
  const backoff = Math.max(0, Number(node.retry?.backoffMs ?? 0));

  let last: StepResult = { id: node.id, kind: node.kind, status: "error", detail: "node did not run" };

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // Resolve per attempt so a retry sees outputs written since the last try.
      // A loop's `body` is deliberately left raw: it references {{steps.item…}},
      // which only exists once the loop binds each item.
      const resolved: WfNode = { ...node, config: resolveConfig(node, ctx) };
      const native = await withTimeout(runNativeNode(resolved, ctx, deps), node.timeoutMs, node.id);
      last = native ?? (await withTimeout(runStep(nodeToStep(resolved), wf, deps), node.timeoutMs, node.id));
    } catch (e) {
      last = { id: node.id, kind: node.kind, status: "error", detail: (e as Error).message };
    }

    if (last.status !== "error") {
      return {
        id: node.id,
        kind: node.kind,
        status: last.status,
        attempts: attempt,
        ...(last.detail !== undefined ? { detail: last.detail } : {}),
        ...(last.output !== undefined ? { output: last.output } : {}),
        ...(last.halt ? { halt: true } : {}),
        startedAt,
        durationMs: Date.now() - began,
      };
    }

    if (attempt <= maxRetries && backoff > 0) await sleep(backoff * attempt);
  }

  return {
    id: node.id,
    kind: node.kind,
    status: "error",
    attempts: maxRetries + 1,
    ...(last.detail !== undefined ? { detail: last.detail } : {}),
    startedAt,
    durationMs: Date.now() - began,
  };
}

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

/**
 * Run a workflow graph.
 *
 * Scheduling rule: a node becomes runnable once every predecessor has settled
 * (finished or been skipped). It actually runs when at least one incoming edge
 * fired; otherwise it is skipped and the skip propagates downstream. Nodes that
 * become runnable together execute in parallel, which is what makes fan-out work
 * without needing an explicit "parallel" node kind.
 *
 * A condition node fires only the edges matching its outcome, so true/false
 * branches diverge. An unbranched edge out of a condition fires on pass only,
 * preserving the halt-on-false behaviour of the original flat runner.
 */
export async function runGraph(
  wf: WorkflowRow,
  input: Record<string, unknown>,
  deps: WorkflowRunnerDeps,
  graphOverride?: WorkflowGraph,
): Promise<GraphRun> {
  const graph = graphOverride ?? workflowGraph(wf);
  const startedAt = new Date().toISOString();
  const began = Date.now();
  const runId = `run_${began.toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const ctx: RunCtx = { input, steps: {} };
  const results: NodeResult[] = [];

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, typeof graph.edges>();
  const outgoing = new Map<string, typeof graph.edges>();
  for (const n of graph.nodes) {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  }
  for (const e of graph.edges) {
    if (byId.has(e.to)) incoming.get(e.to)!.push(e);
    if (byId.has(e.from)) outgoing.get(e.from)!.push(e);
  }

  /** node id -> ran (true) or was skipped (false). */
  const settled = new Map<string, boolean>();
  /** edges that actually fired. */
  const fired = new Set<string>();
  const edgeKey = (e: { from: string; to: string; branch?: string }) => `${e.from}|${e.to}|${e.branch ?? ""}`;

  let failed: string | undefined;
  let halted = false;
  let executions = 0;

  const readyNodes = (): WfNode[] =>
    graph.nodes.filter((n) => {
      if (settled.has(n.id)) return false;
      return (incoming.get(n.id) ?? []).every((e) => settled.has(e.from));
    });

  while (!failed) {
    const ready = readyNodes();
    if (ready.length === 0) break;

    // Separate nodes that should run from ones whose branch was never taken.
    const toRun: WfNode[] = [];
    for (const n of ready) {
      const preds = incoming.get(n.id) ?? [];
      const reachable = preds.length === 0 || preds.some((e) => fired.has(edgeKey(e)));
      if (reachable) {
        toRun.push(n);
      } else {
        settled.set(n.id, false);
        results.push({ id: n.id, kind: n.kind, status: "skipped", attempts: 0, detail: "branch not taken" });
      }
    }
    if (toRun.length === 0) continue;

    executions += toRun.length;
    if (executions > MAX_NODE_EXECUTIONS) {
      failed = `exceeded ${MAX_NODE_EXECUTIONS} node executions`;
      break;
    }

    const batch = await Promise.all(toRun.map((n) => executeNode(n, wf, ctx, deps)));

    for (const [i, res] of batch.entries()) {
      const node = toRun[i]!;
      results.push(res);
      settled.set(node.id, res.status !== "skipped");
      if (res.output !== undefined) ctx.steps[res.id] = { output: res.output };

      if (res.status === "error") {
        failed ??= res.detail ?? `node '${res.id}' failed`;
        continue;
      }

      // Fire outgoing edges. Conditions fire only the branch that matches.
      const passed = res.status === "ok";
      for (const e of outgoing.get(node.id) ?? []) {
        if (node.kind === "condition") {
          const wants = e.branch ?? "true";
          if ((wants === "true") !== passed) continue;
        } else if (!passed) {
          continue;
        }
        fired.add(edgeKey(e));
      }

      if (node.kind === "condition" && !passed) {
        const hasFalsePath = (outgoing.get(node.id) ?? []).some((e) => e.branch === "false");
        if (!hasFalsePath) halted = true;
      }
    }
  }

  const finished = Date.now();
  const unreached = graph.nodes.filter((n) => !settled.has(n.id)).length;
  const completed = !failed && !halted && unreached === 0;

  const run: GraphRun = {
    id: runId,
    workflow: wf.slug ?? wf.name,
    completed,
    status: failed ? "failed" : completed ? "completed" : "halted",
    startedAt,
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - began,
    nodes: results,
    steps: results as unknown as StepResult[],
    ...(failed ? { error: failed } : {}),
  };
  if (completed) run.output = mapOutput(wf, ctx);
  return run;
}
