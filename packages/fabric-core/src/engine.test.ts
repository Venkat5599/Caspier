import { describe, expect, it } from "bun:test";
import { runGraph } from "./engine.ts";
import { stepsToGraph, validateGraph, findCycle, autoLayout } from "./graph.ts";
import type { WorkflowGraph, WorkflowRow, WfNode, WfEdge } from "./types.ts";

const deps = {
  catalog: { loadCatalog: async () => ({ apis: [], workflows: [] }) } as never,
  gatewayUrl: "http://gateway.test",
};

function wf(partial: Partial<WorkflowRow> = {}): WorkflowRow {
  return {
    id: "wf_1",
    name: "test",
    slug: "test",
    description: null,
    is_public: false,
    input_variables: [],
    steps: [],
    output_mapping: [],
    allowed_contracts: [],
    tags: [],
    ...partial,
  };
}

const graph = (nodes: WfNode[], edges: WfEdge[]): WorkflowGraph => ({ nodes, edges });

describe("graph conversion", () => {
  it("converts a flat step list into a linear chain", () => {
    const g = stepsToGraph([
      { id: "a", kind: "condition", left: "1", op: "<=", right: "2" },
      { id: "b", kind: "http", url: "http://x.test" },
    ]);
    expect(g.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(g.edges).toEqual([{ from: "a", to: "b" }]);
    // kind-specific fields move into config; id/kind stay on the node
    expect(g.nodes[0]!.config).toEqual({ left: "1", op: "<=", right: "2" });
  });

  it("names unnamed steps positionally", () => {
    const g = stepsToGraph([{ id: "", kind: "http", url: "http://x.test" }] as never);
    expect(g.nodes[0]!.id).toBe("step_1");
  });
});

describe("validation", () => {
  it("flags dangling edges and duplicate ids", () => {
    const issues = validateGraph(
      graph(
        [
          { id: "a", kind: "trigger" },
          { id: "a", kind: "http" },
        ],
        [{ from: "a", to: "ghost" }],
      ),
    );
    const messages = issues.map((i) => i.message);
    expect(messages).toContain("duplicate node id 'a'");
    expect(messages).toContain("edge to unknown node 'ghost'");
  });

  it("detects a cycle", () => {
    const g = graph(
      [
        { id: "a", kind: "trigger" },
        { id: "b", kind: "http" },
      ],
      [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ],
    );
    expect(findCycle(g)).not.toBeNull();
    expect(validateGraph(g).some((i) => i.message.includes("cycle"))).toBe(true);
  });

  it("accepts a valid branching graph", () => {
    const g = graph(
      [
        { id: "gate", kind: "condition" },
        { id: "yes", kind: "transform" },
        { id: "no", kind: "transform" },
      ],
      [
        { from: "gate", to: "yes", branch: "true" },
        { from: "gate", to: "no", branch: "false" },
      ],
    );
    expect(validateGraph(g).filter((i) => i.level === "error")).toEqual([]);
  });
});

describe("layout", () => {
  it("layers nodes by depth and keeps explicit positions", () => {
    const g = autoLayout(
      graph(
        [
          { id: "a", kind: "trigger" },
          { id: "b", kind: "http" },
          { id: "pinned", kind: "http", position: { x: 999, y: 999 } },
        ],
        [{ from: "a", to: "b" }],
      ),
    );
    const at = (id: string) => g.nodes.find((n) => n.id === id)!.position!;
    expect(at("a").x).toBeLessThan(at("b").x);
    expect(at("pinned")).toEqual({ x: 999, y: 999 });
  });
});

describe("runGraph", () => {
  it("takes the true branch and skips the false branch", async () => {
    const run = await runGraph(
      wf(),
      {},
      deps,
      graph(
        [
          { id: "gate", kind: "condition", config: { left: "1", op: "<=", right: "2" } },
          { id: "yes", kind: "transform", config: { value: "took-true" } },
          { id: "no", kind: "transform", config: { value: "took-false" } },
        ],
        [
          { from: "gate", to: "yes", branch: "true" },
          { from: "gate", to: "no", branch: "false" },
        ],
      ),
    );

    expect(run.status).toBe("completed");
    const byId = Object.fromEntries(run.nodes.map((n) => [n.id, n]));
    expect(byId.yes!.status).toBe("ok");
    expect(byId.yes!.output).toBe("took-true");
    expect(byId.no!.status).toBe("skipped");
    expect(byId.no!.detail).toBe("branch not taken");
  });

  it("takes the false branch when the comparison fails", async () => {
    const run = await runGraph(
      wf(),
      {},
      deps,
      graph(
        [
          { id: "gate", kind: "condition", config: { left: "9", op: "<=", right: "2" } },
          { id: "yes", kind: "transform", config: { value: "t" } },
          { id: "no", kind: "transform", config: { value: "f" } },
        ],
        [
          { from: "gate", to: "yes", branch: "true" },
          { from: "gate", to: "no", branch: "false" },
        ],
      ),
    );

    const byId = Object.fromEntries(run.nodes.map((n) => [n.id, n]));
    expect(byId.no!.status).toBe("ok");
    expect(byId.yes!.status).toBe("skipped");
    expect(run.status).toBe("completed");
  });

  it("halts when a condition fails and no false path exists (legacy behaviour)", async () => {
    const run = await runGraph(
      wf({
        steps: [
          { id: "gate", kind: "condition", left: "9", op: "<=", right: "2" },
          { id: "after", kind: "http", url: "http://never.test" },
        ],
      }),
      {},
      deps,
    );

    expect(run.completed).toBe(false);
    expect(run.status).toBe("halted");
    // The old runner simply stopped emitting results. The graph engine reports
    // the unreached node explicitly, which the run view already renders.
    expect(run.nodes.find((n) => n.id === "after")?.status).toBe("skipped");
  });

  it("runs independent branches in parallel", async () => {
    const began = Date.now();
    const run = await runGraph(
      wf(),
      {},
      deps,
      graph(
        [
          { id: "root", kind: "trigger" },
          { id: "a", kind: "delay", config: { ms: 60 } },
          { id: "b", kind: "delay", config: { ms: 60 } },
        ],
        [
          { from: "root", to: "a" },
          { from: "root", to: "b" },
        ],
      ),
    );
    const elapsed = Date.now() - began;

    expect(run.status).toBe("completed");
    // Sequential execution would need ~120ms; parallel stays well under.
    expect(elapsed).toBeLessThan(115);
  });

  it("joins a fan-out before running the downstream node", async () => {
    const fetchImpl = (async (url: string) =>
      new Response(JSON.stringify({ url: String(url) }), { status: 200 })) as unknown as typeof fetch;

    const run = await runGraph(
      wf(),
      {},
      { ...deps, fetchImpl },
      graph(
        [
          { id: "root", kind: "trigger" },
          { id: "a", kind: "http", config: { url: "http://a.test" } },
          { id: "b", kind: "http", config: { url: "http://b.test" } },
          {
            id: "join",
            kind: "transform",
            config: { value: "{{steps.a.output.url}}+{{steps.b.output.url}}" },
          },
        ],
        [
          { from: "root", to: "a" },
          { from: "root", to: "b" },
          { from: "a", to: "join" },
          { from: "b", to: "join" },
        ],
      ),
    );

    expect(run.status).toBe("completed");
    const join = run.nodes.find((n) => n.id === "join")!;
    expect(join.output).toBe("http://a.test+http://b.test");
  });

  it("retries a failing node and reports the attempt count", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      if (calls < 3) return new Response("boom", { status: 500 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;

    const run = await runGraph(
      wf(),
      {},
      { ...deps, fetchImpl },
      graph([{ id: "flaky", kind: "http", config: { url: "http://flaky.test" }, retry: { max: 3 } }], []),
    );

    expect(calls).toBe(3);
    const node = run.nodes.find((n) => n.id === "flaky")!;
    expect(node.status).toBe("ok");
    expect(node.attempts).toBe(3);
    expect(run.status).toBe("completed");
  });

  it("gives up after exhausting retries", async () => {
    const fetchImpl = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const run = await runGraph(
      wf(),
      {},
      { ...deps, fetchImpl },
      graph([{ id: "dead", kind: "http", config: { url: "http://dead.test" }, retry: { max: 1 } }], []),
    );

    const node = run.nodes.find((n) => n.id === "dead")!;
    expect(node.attempts).toBe(2);
    expect(node.status).toBe("error");
    expect(run.status).toBe("failed");
    expect(run.error).toBeDefined();
  });

  it("times a node out", async () => {
    const fetchImpl = (async () => {
      await new Promise((r) => setTimeout(r, 200));
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    const run = await runGraph(
      wf(),
      {},
      { ...deps, fetchImpl },
      graph([{ id: "slow", kind: "http", config: { url: "http://slow.test" }, timeoutMs: 30 }], []),
    );

    expect(run.status).toBe("failed");
    expect(run.nodes[0]!.detail).toContain("timed out");
  });

  it("resolves templates against input and upstream node output", async () => {
    const run = await runGraph(
      wf({ output_mapping: [{ name: "greeting", from: "{{steps.build.output}}" }] }),
      { who: "world" },
      deps,
      graph([{ id: "build", kind: "transform", config: { value: "hello {{input.who}}" } }], []),
    );

    expect(run.nodes[0]!.output).toBe("hello world");
    expect(run.output).toEqual({ greeting: "hello world" });
  });

  it("iterates a loop node over an array", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (url: string) => {
      seen.push(String(url));
      return new Response(JSON.stringify({ url: String(url) }), { status: 200 });
    }) as unknown as typeof fetch;

    const run = await runGraph(
      wf(),
      { hosts: ["a", "b", "c"] },
      { ...deps, fetchImpl },
      graph(
        [
          {
            id: "each",
            kind: "loop",
            config: {
              over: "{{input.hosts}}",
              body: [{ id: "call", kind: "http", url: "http://{{steps.item.output}}.test" }],
            },
          },
        ],
        [],
      ),
    );

    expect(run.status).toBe("completed");
    expect(seen).toEqual(["http://a.test", "http://b.test", "http://c.test"]);
    expect(run.nodes[0]!.detail).toBe("3 item(s)");
  });

  it("marks everything downstream of a failure as unreached", async () => {
    const fetchImpl = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const run = await runGraph(
      wf(),
      {},
      { ...deps, fetchImpl },
      graph(
        [
          { id: "first", kind: "http", config: { url: "http://boom.test" } },
          { id: "second", kind: "transform", config: { value: "never" } },
        ],
        [{ from: "first", to: "second" }],
      ),
    );

    expect(run.status).toBe("failed");
    expect(run.nodes.find((n) => n.id === "second")).toBeUndefined();
  });

  it("keeps the legacy run shape for existing callers", async () => {
    const run = await runGraph(
      wf({ steps: [{ id: "only", kind: "condition", left: "1", op: "==", right: "1" }] }),
      {},
      deps,
    );

    expect(run.workflow).toBe("test");
    expect(Array.isArray(run.steps)).toBe(true);
    expect(run.steps).toHaveLength(1);
    expect(run.completed).toBe(true);
  });
});
