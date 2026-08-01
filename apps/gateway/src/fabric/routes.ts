import type { Hono } from "hono";
import type { CatalogService } from "@fabric/catalog";
import type { ChainWorker } from "@fabric/chain-worker";
import type { AuthzService } from "@fabric/authz";
import {
  createCatalogLoader,
  runWorkflow,
  invokeSkillViaGateway,
  resolveScope,
  withScope,
  validateGraph,
  rankCandidates,
  matchesCapability,
  p50,
  type WorkflowRunnerDeps,
  type GraphRun,
  type RouteCandidate,
  type RouteStrategy,
} from "@fabric/fabric-core";
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflowGraph,
  recordRun,
  listRuns,
  getRun,
  listApis,
  latencySamples,
  getApi,
  createApi,
  bumpApiStats,
  listMcpServers,
  getMcpServer,
  createMcpServer,
  patchMcpServer,
  appendLog,
  listLogs,
  fabricStats,
  recentActivity,
  seedBuiltinWorkflows,
  seedMarketplaceTemplates,
} from "./store.ts";

export type FabricRouteDeps = {
  catalog: CatalogService;
  chain: ChainWorker;
  authz: AuthzService;
  gatewayUrl: string;
};

/** Persist a completed run so the dashboard can show execution history. */
function saveRun(wf: { slug: string | null; name: string }, run: GraphRun) {
  recordRun({
    id: run.id,
    workflow_slug: wf.slug ?? wf.name,
    workflow_name: wf.name,
    status: run.status,
    completed: run.completed,
    created_at: run.startedAt,
    duration_ms: run.durationMs,
    node_count: run.nodes.length,
    ...(run.error ? { error: run.error } : {}),
    nodes: run.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      status: n.status,
      attempts: n.attempts,
      ...(n.detail ? { detail: n.detail } : {}),
    })),
    ...(run.output ? { output: run.output } : {}),
  });
  return run;
}

export function mountFabricRoutes(app: Hono, deps: FabricRouteDeps) {
  const catalogLoader = createCatalogLoader(deps.gatewayUrl);
  const runnerDeps: WorkflowRunnerDeps = {
    catalog: catalogLoader,
    gatewayUrl: deps.gatewayUrl,
    transfer: async (recipient, amountWei) => {
      const tx = await deps.chain.transfer({ recipientPublicKeyHex: recipient, amountWei });
      return { deployHash: tx.deployHash };
    },
  };


  /**
   * Build the routable candidate set from what is actually published.
   * Price comes from the manifest; latency and success rate from recorded
   * calls, so an unproven service is reported as unmeasured rather than good.
   */
  const buildCandidates = async (capability: string | null): Promise<RouteCandidate[]> => {
    const out: RouteCandidate[] = [];

    for (const api of listApis("public")) {
      if (!matchesCapability({ slug: api.slug ?? api.name, name: api.name, description: api.description }, capability)) {
        continue;
      }
      const slug = api.slug ?? api.name;
      const median = p50(latencySamples(slug));
      out.push({
        slug,
        name: api.name,
        kind: "api",
        priceWei: String(api.price ?? "0"),
        samples: api.request_count,
        successRate: api.request_count > 0 ? api.success_count / api.request_count : 1,
        ...(median !== undefined ? { p50LatencyMs: median } : {}),
      });
    }

    for (const skill of await deps.catalog.list()) {
      const unit = skill as unknown as { slug?: string; name?: string; description?: string; pricePerCall?: string };
      const slug = unit.slug ?? unit.name ?? "";
      if (!slug || out.some((c) => c.slug === slug)) continue;
      if (!matchesCapability({ slug, name: unit.name ?? slug, description: unit.description ?? null }, capability)) {
        continue;
      }
      const median = p50(latencySamples(slug));
      out.push({
        slug,
        name: unit.name ?? slug,
        kind: "skill",
        priceWei: String(unit.pricePerCall ?? "0"),
        samples: 0,
        successRate: 1,
        ...(median !== undefined ? { p50LatencyMs: median } : {}),
      });
    }

    return out;
  };

  const readStrategy = (v: string | undefined): RouteStrategy =>
    v === "cheapest" || v === "fastest" || v === "balanced" ? v : "balanced";

  /** Discover + compare, without spending anything. */
  app.get("/route/candidates", async (c) => {
    const capability = c.req.query("capability") ?? null;
    const strategy = readStrategy(c.req.query("strategy"));
    const decision = rankCandidates(await buildCandidates(capability), strategy, capability);
    return c.json(decision);
  });

  /** Discover, compare, then invoke the winner through the paid path. */
  app.post("/route", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      capability?: string;
      strategy?: string;
      args?: Record<string, unknown>;
      dryRun?: boolean;
    };
    const capability = body.capability ?? null;
    const strategy = readStrategy(body.strategy);
    const decision = rankCandidates(await buildCandidates(capability), strategy, capability);

    if (!decision.chosen) return c.json({ ok: false, ...decision }, 404);
    if (body.dryRun) return c.json({ ok: true, ...decision });

    const started = Date.now();
    const out = await invokeSkillViaGateway(deps.gatewayUrl, decision.chosen.slug, body.args ?? {});
    const ok = out.status >= 200 && out.status < 300;
    appendLog({
      api_slug: decision.chosen.slug,
      api_name: decision.chosen.name,
      kind: decision.chosen.kind === "api" ? "api" : "skill",
      status: out.status,
      ok,
      paid: true,
      price: Number(decision.chosen.priceWei),
      duration_ms: Date.now() - started,
    });

    return c.json({ ok, routedTo: decision.chosen.slug, strategy, rationale: decision.rationale, ranked: decision.ranked, status: out.status, body: out.body });
  });

  app.get("/fabric/apis", async (c) => {
    const scope = c.req.query("scope");
    const owner = c.req.query("owner");
    return c.json({ apis: listApis(scope, owner) });
  });

  app.post("/fabric/apis", async (c) => {
    const body = await c.req.json();
    if (!body?.name || !body?.target_url) return c.json({ ok: false, error: "name and target_url required" }, 400);
    const api = createApi(body);
    catalogLoader.invalidateCache();
    return c.json({ ok: true, api }, 201);
  });

  app.get("/fabric/apis/:slug", async (c) => {
    const api = getApi(c.req.param("slug"));
    if (!api) return c.json({ error: "not found" }, 404);
    return c.json(api);
  });

  app.get("/fabric/workflows", async (c) => {
    const scope = c.req.query("scope");
    const owner = c.req.query("owner");
    return c.json({ workflows: listWorkflows(scope, owner) });
  });

  app.post("/fabric/workflows", async (c) => {
    const body = await c.req.json();
    if (!body?.name) return c.json({ ok: false, error: "name required" }, 400);

    // Reject a structurally broken graph at publish time rather than letting it
    // fail mid-run: a cycle or a dangling edge is always an authoring mistake.
    if (body.graph) {
      const errors = validateGraph(body.graph).filter((i) => i.level === "error");
      if (errors.length > 0) {
        return c.json({ ok: false, error: errors.map((e) => e.message).join("; ") }, 400);
      }
    }

    const wf = createWorkflow(body);
    catalogLoader.invalidateCache();
    return c.json({ ok: true, workflow: wf }, 201);
  });

  /** Replace a workflow's graph — what the canvas editor saves. */
  app.put("/fabric/workflows/:slug/graph", async (c) => {
    const graph = (await c.req.json()) as { nodes?: unknown; edges?: unknown };
    if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges)) {
      return c.json({ ok: false, error: "expected { nodes: [], edges: [] }" }, 400);
    }
    const issues = validateGraph(graph as never);
    const errors = issues.filter((i) => i.level === "error");
    if (errors.length > 0) {
      return c.json({ ok: false, error: errors.map((e) => e.message).join("; "), issues }, 400);
    }
    const wf = updateWorkflowGraph(c.req.param("slug"), graph as never);
    if (!wf) return c.json({ ok: false, error: "not found" }, 404);
    catalogLoader.invalidateCache();
    return c.json({ ok: true, workflow: wf, issues });
  });

  /** Execution history, newest first. `?workflow=slug` narrows to one flow. */
  app.get("/fabric/runs", async (c) => {
    const slug = c.req.query("workflow");
    const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? 50)));
    return c.json({ runs: listRuns(slug, limit) });
  });

  app.get("/fabric/runs/:id", async (c) => {
    const run = getRun(c.req.param("id"));
    if (!run) return c.json({ error: "not found" }, 404);
    return c.json(run);
  });

  app.get("/fabric/workflows/:slug", async (c) => {
    const wf = getWorkflow(c.req.param("slug"));
    if (!wf) return c.json({ error: "not found" }, 404);
    return c.json(wf);
  });

  app.post("/fabric/workflows/seed", async (c) => {
    const created = seedBuiltinWorkflows();
    catalogLoader.invalidateCache();
    return c.json({ created }, 201);
  });

  app.post("/fabric/marketplace/seed", async (c) => {
    const created = seedMarketplaceTemplates();
    catalogLoader.invalidateCache();
    return c.json({ ok: true, ...created }, 201);
  });

  app.get("/fabric/mcp-servers", async (c) => {
    const scope = c.req.query("scope");
    const owner = c.req.query("owner");
    return c.json({ servers: listMcpServers(scope, owner) });
  });

  app.post("/fabric/mcp-servers", async (c) => {
    const body = await c.req.json();
    if (!body?.display_name) return c.json({ ok: false, error: "display_name required" }, 400);
    const server = createMcpServer(body);
    return c.json({ ok: true, server }, 201);
  });

  app.patch("/fabric/mcp-servers/:slug", async (c) => {
    const body = await c.req.json();
    const server = patchMcpServer(c.req.param("slug"), body);
    if (!server) return c.json({ ok: false, error: "not found" }, 404);
    return c.json({ ok: true, server });
  });

  app.get("/fabric/mcp-servers/:slug", async (c) => {
    const server = getMcpServer(c.req.param("slug"));
    if (!server) return c.json({ error: "not found" }, 404);
    return c.json(server);
  });

  app.get("/fabric/stats", async (c) => {
    const owner = c.req.query("owner");
    const skills = await deps.catalog.list();
    return c.json(fabricStats(skills.length, owner, deps.authz.list()));
  });

  app.get("/fabric/wallet-status", async (c) => {
    const address = c.req.query("address");
    if (!address?.trim()) return c.json({ ok: false, error: "address required" }, 400);
    try {
      const wei = await deps.chain.getBalanceWei(address.trim());
      const n = Number(wei);
      return c.json({
        ok: true,
        funded: n > 0,
        wei,
        ETH: (n / 1e18).toFixed(6),
      });
    } catch (e) {
      return c.json({ ok: false, error: (e as Error).message }, 502);
    }
  });

  app.get("/fabric/activity", async (c) => c.json({ activity: recentActivity() }));

  app.get("/fabric/logs", async (c) => {
    const period = c.req.query("period") ?? "all";
    return c.json(listLogs(period));
  });

  app.post("/fabric/logs", async (c) => {
    const body = await c.req.json();
    const row = appendLog({
      api_slug: body.api_slug ?? null,
      api_name: body.api_name ?? null,
      kind: body.kind ?? "api",
      status: body.status ?? null,
      ok: Boolean(body.ok),
      paid: Boolean(body.paid),
      price: Number(body.price ?? 0),
    });
    return c.json({ ok: true, log: row }, 201);
  });

  app.post("/fabric/run/workflow", async (c) => {
    const scope = resolveScope(c.req.header("authorization"));
    const { slug, input } = (await c.req.json()) as { slug?: string; input?: Record<string, unknown> };
    if (!slug) return c.json({ ok: false, error: "slug required" }, 400);
    const wf = getWorkflow(slug);
    if (!wf) return c.json({ ok: false, error: `no workflow '${slug}'` }, 404);
    try {
      const run = (await withScope(scope, () => runWorkflow(wf, input ?? {}, runnerDeps))) as GraphRun;
      saveRun(wf, run);
      return c.json({ ok: true, run });
    } catch (e) {
      return c.json({ ok: false, error: (e as Error).message }, 500);
    }
  });

  app.post("/fabric/run/api", async (c) => {
    const { slug, args } = (await c.req.json()) as { slug?: string; args?: Record<string, unknown> };
    if (!slug) return c.json({ ok: false, error: "slug required" }, 400);
    const proxy = getApi(slug);
    if (proxy) {
      try {
        let url = proxy.target_url;
        const params = new URLSearchParams();
        for (const v of proxy.variables) {
          const val = args?.[v.name];
          if (val == null) continue;
          if (v.in === "query") params.set(v.name, String(val));
          else if (v.in === "path") url = url.replace(`{${v.name}}`, encodeURIComponent(String(val)));
        }
        const qs = proxy.query_params ?? params.toString();
        if (qs) url += (url.includes("?") ? "&" : "?") + qs;
        const headers: Record<string, string> = { accept: "application/json" };
        if (proxy.content_type) headers["content-type"] = proxy.content_type;
        for (const h of proxy.auth_headers) {
          if (h.name) headers[h.name] = h.value;
        }
        const init: RequestInit = { method: proxy.http_method, headers };
        if (proxy.http_method !== "GET" && proxy.http_method !== "HEAD") {
          init.body = JSON.stringify(args ?? {});
        }
        const startedAt = Date.now();
        const upstream = await fetch(url, init);
        const durationMs = Date.now() - startedAt;
        const body = await upstream.text();
        let parsed: unknown = body;
        try {
          parsed = JSON.parse(body);
        } catch {
          /* text */
        }
        const ok = upstream.ok;
        bumpApiStats(slug, ok, false, Number(proxy.price));
        appendLog({
          api_slug: slug,
          api_name: proxy.name,
          kind: "api",
          status: upstream.status,
          ok,
          paid: false,
          price: Number(proxy.price),
          duration_ms: durationMs,
        });
        return c.json({ ok, status: upstream.status, body: parsed });
      } catch (e) {
        return c.json({ ok: false, error: (e as Error).message }, 500);
      }
    }
    try {
      const out = await invokeSkillViaGateway(deps.gatewayUrl, slug, args ?? {});
      appendLog({
        api_slug: slug,
        api_name: slug,
        kind: "skill",
        status: out.status,
        ok: out.status >= 200 && out.status < 400,
        paid: false,
        price: 0,
      });
      return c.json({ ok: true, status: out.status, body: out.body });
    } catch (e) {
      return c.json({ ok: false, error: (e as Error).message }, 500);
    }
  });

  app.post("/fabric/run", async (c) => {
    const body = (await c.req.json()) as {
      kind?: "api" | "workflow";
      slug?: string;
      args?: Record<string, unknown>;
      input?: Record<string, unknown>;
    };
    if (body.kind === "workflow") {
      const scope = resolveScope(c.req.header("authorization"));
      if (!body.slug) return c.json({ ok: false, error: "slug required" }, 400);
      const wf = getWorkflow(body.slug);
      if (!wf) return c.json({ ok: false, error: "not found" }, 404);
      const run = (await withScope(scope, () => runWorkflow(wf, body.input ?? {}, runnerDeps))) as GraphRun;
      saveRun(wf, run);
      return c.json({ ok: true, run });
    }
    if (!body.slug) return c.json({ ok: false, error: "slug required" }, 400);
    const out = await invokeSkillViaGateway(deps.gatewayUrl, body.slug, body.args ?? {});
    return c.json({ ok: true, status: out.status, body: out.body });
  });

  app.post("/fabric/provision", async (c) => {
    const body = (await c.req.json()) as {
      agentPublicKeyHex?: string;
      scope?: { maxSpendPerCall: string; expiresAt: string };
    };
    if (!body.agentPublicKeyHex || !body.scope?.maxSpendPerCall) {
      return c.json({ ok: false, error: "agentPublicKeyHex and scope required" }, 400);
    }
    try {
      // `mint` registers the agent on-chain and is async. Without the await
      // this read `.id` off a pending Promise, threw, and the route answered
      // 500 on every call — so provisioning could never succeed.
      const key = await deps.authz.mint(body.agentPublicKeyHex, body.scope);
      const token = `kairos_sk_${key.id.replace(/-/g, "").slice(0, 24)}`;
      return c.json({ ok: true, sessionId: key.id, token, key });
    } catch (e) {
      return c.json({ ok: false, error: (e as Error).message }, 500);
    }
  });

  app.get("/fabric/health", async (c) => {
    const { apis, workflows } = await catalogLoader.loadCatalog();
    return c.json({
      ok: true,
      tools: { apis: apis.length, workflows: workflows.length },
      chain: deps.chain.status(),
    });
  });
}
