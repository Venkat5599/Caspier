import type { WfEdge, WfNode, WfStep, WorkflowGraph, WorkflowRow } from "./types.ts";

/**
 * Convert the legacy flat `steps` array into an equivalent linear graph.
 *
 * The old runner walked the array in order and stopped the whole run when a
 * condition compared false. A chain of unbranched edges reproduces that exactly:
 * a false condition fires no outgoing edge, so everything downstream is skipped
 * and the run ends incomplete.
 */
export function stepsToGraph(steps: WfStep[]): WorkflowGraph {
  const nodes: WfNode[] = steps.map((s, i) => {
    const { id, kind, ...rest } = s as WfStep & Record<string, unknown>;
    return {
      id: id || `step_${i + 1}`,
      kind,
      position: { x: 0, y: i * 140 },
      config: rest as Record<string, unknown>,
    };
  });

  const edges: WfEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i]!.id, to: nodes[i + 1]!.id });
  }
  return { nodes, edges };
}

/** A graph is usable if it has at least one node. Empty graphs fall back to steps. */
function hasNodes(g: WorkflowGraph | undefined): g is WorkflowGraph {
  return !!g && Array.isArray(g.nodes) && g.nodes.length > 0;
}

/** The graph a workflow should actually run: explicit graph, else converted steps. */
export function workflowGraph(wf: WorkflowRow): WorkflowGraph {
  if (hasNodes(wf.graph)) {
    return { nodes: wf.graph.nodes, edges: wf.graph.edges ?? [] };
  }
  return stepsToGraph(wf.steps ?? []);
}

export type GraphIssue = { level: "error" | "warning"; message: string };

/**
 * Structural checks that are cheap to run and catch the mistakes a canvas
 * editor actually produces: dangling edges, duplicate ids, cycles, no entry.
 */
export function validateGraph(g: WorkflowGraph): GraphIssue[] {
  const issues: GraphIssue[] = [];
  const ids = new Set<string>();

  for (const n of g.nodes) {
    if (!n.id) {
      issues.push({ level: "error", message: "node with empty id" });
      continue;
    }
    if (ids.has(n.id)) issues.push({ level: "error", message: `duplicate node id '${n.id}'` });
    ids.add(n.id);
  }

  for (const e of g.edges) {
    if (!ids.has(e.from)) issues.push({ level: "error", message: `edge from unknown node '${e.from}'` });
    if (!ids.has(e.to)) issues.push({ level: "error", message: `edge to unknown node '${e.to}'` });
  }

  if (findCycle(g)) {
    issues.push({ level: "error", message: "graph contains a cycle — execution would never finish" });
  }

  const targeted = new Set(g.edges.map((e) => e.to));
  const roots = g.nodes.filter((n) => !targeted.has(n.id));
  if (g.nodes.length > 0 && roots.length === 0) {
    issues.push({ level: "error", message: "no entry node — every node has an incoming edge" });
  }
  if (roots.length > 1) {
    issues.push({ level: "warning", message: `${roots.length} entry nodes — all will start in parallel` });
  }

  return issues;
}

/** Depth-first cycle probe. Returns the offending node id, or null when acyclic. */
export function findCycle(g: WorkflowGraph): string | null {
  const out = new Map<string, string[]>();
  for (const e of g.edges) {
    const list = out.get(e.from) ?? [];
    list.push(e.to);
    out.set(e.from, list);
  }

  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const n of g.nodes) color.set(n.id, WHITE);

  const walk = (id: string): string | null => {
    color.set(id, GREY);
    for (const next of out.get(id) ?? []) {
      const c = color.get(next);
      if (c === GREY) return next;
      if (c === WHITE) {
        const hit = walk(next);
        if (hit) return hit;
      }
    }
    color.set(id, BLACK);
    return null;
  };

  for (const n of g.nodes) {
    if (color.get(n.id) === WHITE) {
      const hit = walk(n.id);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Assign x/y to any node missing a position, so a graph authored over the API
 * (or converted from legacy steps) still renders sensibly on the canvas.
 * Layered left-to-right by longest-path depth, stacked vertically within a layer.
 */
export function autoLayout(g: WorkflowGraph, colGap = 260, rowGap = 130): WorkflowGraph {
  const preds = new Map<string, string[]>();
  for (const n of g.nodes) preds.set(n.id, []);
  for (const e of g.edges) preds.get(e.to)?.push(e.from);

  const depth = new Map<string, number>();
  const acyclic = !findCycle(g);

  const depthOf = (id: string, seen: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const parents = preds.get(id) ?? [];
    const d = parents.length === 0 ? 0 : Math.max(...parents.map((p) => depthOf(p, seen) + 1));
    depth.set(id, d);
    return d;
  };

  for (const n of g.nodes) depth.set(n.id, acyclic ? depthOf(n.id, new Set()) : 0);

  const perLayer = new Map<number, number>();
  const nodes = g.nodes.map((n) => {
    if (n.position && Number.isFinite(n.position.x) && Number.isFinite(n.position.y)) return n;
    const d = depth.get(n.id) ?? 0;
    const row = perLayer.get(d) ?? 0;
    perLayer.set(d, row + 1);
    return { ...n, position: { x: d * colGap, y: row * rowGap } };
  });

  return { nodes, edges: g.edges };
}
