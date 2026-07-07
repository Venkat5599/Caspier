// Caspier Fabric MCP server — catalog-driven dynamic tools (api__*, wf__*) + builtins.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import { ChainWorker, loadChainConfig } from "@fabric/chain-worker";
import {
  buildFabricServer,
  registerCatalog,
  createCatalogLoader,
  resolveScope,
  withScope,
  runWorkflow,
  invokeSkillViaGateway,
  type WorkflowRunnerDeps,
} from "@fabric/fabric-core";

const PORT = Number(process.env.FABRIC_MCP_PORT ?? 8403);
const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:8080";
const chain = new ChainWorker(loadChainConfig());
const catalog = createCatalogLoader(gatewayUrl);

const runnerDeps: WorkflowRunnerDeps = {
  catalog,
  gatewayUrl,
  transfer: async (recipient, amountMotes) => {
    const tx = await chain.transfer({ recipientPublicKeyHex: recipient, amountMotes });
    return { deployHash: tx.deployHash, demo: tx.demo };
  },
};

const fabricDeps = {
  catalog,
  gatewayUrl,
  runnerDeps,
  chainStatus: async () => chain.status(),
  sessionBudget: async () => ({ remaining: "scoped via session keys", unit: "motes" }),
};

const { server, registered } = await buildFabricServer(McpServer, fabricDeps);

async function findWorkflow(slug: string) {
  return catalog.findWorkflow(slug);
}

if (process.argv.includes("--stdio")) {
  await server.connect(new StdioServerTransport());
  process.stderr.write(
    `caspier fabric MCP (stdio) · ${registered.apis.length} api__* · ${registered.workflows.length} wf__*\n`,
  );
} else {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true, tools: registered, chain: chain.status() }));

  app.post("/reload", async (c) => {
    catalog.invalidateCache();
    const r = await registerCatalog(server, fabricDeps);
    return c.json({ ok: true, reloaded: r });
  });

  app.post("/run/workflow", async (c) => {
    const scope = resolveScope(c.req.header("authorization"));
    const { slug, input } = await c.req.json<{ slug?: string; input?: Record<string, unknown> }>();
    if (!slug) return c.json({ ok: false, error: "slug required" }, 400);
    const wf = await findWorkflow(slug);
    if (!wf) return c.json({ ok: false, error: `no workflow '${slug}'` }, 404);
    try {
      const run = await withScope(scope, () => runWorkflow(wf, input ?? {}, runnerDeps));
      return c.json({ ok: true, run });
    } catch (e) {
      return c.json({ ok: false, error: (e as Error).message }, 500);
    }
  });

  app.post("/run/api", async (c) => {
    const { slug, args } = await c.req.json<{ slug?: string; args?: Record<string, unknown> }>();
    if (!slug) return c.json({ ok: false, error: "slug required" }, 400);
    try {
      const out = await invokeSkillViaGateway(gatewayUrl, slug, args ?? {});
      return c.json({ ok: true, status: out.status, body: out.body });
    } catch (e) {
      return c.json({ ok: false, error: (e as Error).message }, 500);
    }
  });

  app.post("/mcp", async (c) => {
    const scope = resolveScope(c.req.header("authorization"));
    const body = await c.req.json();
    return await withScope(scope, async () => {
      const res = await transport.handleRequest(
        c.req.raw as never,
        new Response() as never,
        body,
      );
      return res as unknown as Response;
    });
  });

  Bun.serve({ port: PORT, fetch: app.fetch });
  process.stderr.write(
    `caspier fabric MCP on http://localhost:${PORT}/mcp  (${registered.apis.length} api__*, ${registered.workflows.length} wf__*)\n`,
  );
}
