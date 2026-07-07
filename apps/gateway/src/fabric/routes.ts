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
  type WorkflowRunnerDeps,
} from "@fabric/fabric-core";
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  listMcpServers,
  getMcpServer,
  createMcpServer,
  patchMcpServer,
  appendLog,
  listLogs,
  fabricStats,
  recentActivity,
  seedBuiltinWorkflows,
} from "./store.ts";

export type FabricRouteDeps = {
  catalog: CatalogService;
  chain: ChainWorker;
  authz: AuthzService;
  gatewayUrl: string;
};

export function mountFabricRoutes(app: Hono, deps: FabricRouteDeps) {
  const catalogLoader = createCatalogLoader(deps.gatewayUrl);
  const runnerDeps: WorkflowRunnerDeps = {
    catalog: catalogLoader,
    gatewayUrl: deps.gatewayUrl,
    transfer: async (recipient, amountMotes) => {
      const tx = await deps.chain.transfer({ recipientPublicKeyHex: recipient, amountMotes });
      return { deployHash: tx.deployHash, demo: tx.demo };
    },
  };

  app.get("/fabric/workflows", async (c) => {
    const scope = c.req.query("scope");
    const owner = c.req.query("owner");
    return c.json({ workflows: listWorkflows(scope, owner) });
  });

  app.post("/fabric/workflows", async (c) => {
    const body = await c.req.json();
    if (!body?.name) return c.json({ ok: false, error: "name required" }, 400);
    const wf = createWorkflow(body);
    catalogLoader.invalidateCache();
    return c.json({ ok: true, workflow: wf }, 201);
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
    return c.json(fabricStats(skills.length, owner));
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
      const run = await withScope(scope, () => runWorkflow(wf, input ?? {}, runnerDeps));
      return c.json({ ok: true, run });
    } catch (e) {
      return c.json({ ok: false, error: (e as Error).message }, 500);
    }
  });

  app.post("/fabric/run/api", async (c) => {
    const { slug, args } = (await c.req.json()) as { slug?: string; args?: Record<string, unknown> };
    if (!slug) return c.json({ ok: false, error: "slug required" }, 400);
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
      const run = await withScope(scope, () => runWorkflow(wf, body.input ?? {}, runnerDeps));
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
      const key = deps.authz.mint(body.agentPublicKeyHex, body.scope);
      const token = `caspier_sk_${key.id.replace(/-/g, "").slice(0, 24)}`;
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
