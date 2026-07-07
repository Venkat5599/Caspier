import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CatalogLoader } from "./catalog.ts";
import type { WorkflowRow } from "./types.ts";
import { createSkillInvoker, registerSkillTool } from "./proxy-tool.ts";
import { runWorkflow, type WorkflowRunnerDeps } from "./steps.ts";

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export type FabricRegisterDeps = {
  catalog: CatalogLoader;
  gatewayUrl: string;
  runnerDeps: WorkflowRunnerDeps;
  chainStatus?: () => Promise<unknown>;
  sessionBudget?: (sessionKeyId?: string) => Promise<unknown>;
};

function wfSchema(wf: WorkflowRow): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const v of wf.input_variables ?? []) {
    const base = z.string().describe(v.description ?? v.name);
    shape[v.name] = v.required ? base : base.optional();
  }
  return shape;
}

function registerWorkflowTool(server: McpServer, wf: WorkflowRow, deps: FabricRegisterDeps) {
  server.registerTool(
    `wf__${wf.slug ?? wf.id}`,
    {
      title: wf.name,
      description: `${wf.description ?? wf.name} · runs the fabric workflow engine on Casper.`,
      inputSchema: wfSchema(wf),
    },
    async (input: Record<string, unknown>) => json(await runWorkflow(wf, input, deps.runnerDeps)),
  );
}

function registerBuiltins(server: McpServer, deps: FabricRegisterDeps) {
  server.registerTool(
    "caspier_chain_status",
    {
      title: "Casper chain status",
      description: "Gateway chain worker status: network, demo mode, public key.",
      inputSchema: {},
    },
    async () => json(deps.chainStatus ? await deps.chainStatus() : { configured: false }),
  );

  server.registerTool(
    "caspier_budget",
    {
      title: "Session budget",
      description: "Remaining scoped spend cap on the calling agent session key.",
      inputSchema: { sessionKeyId: z.string().optional() },
    },
    async ({ sessionKeyId }) => {
      const budget = deps.sessionBudget ? await deps.sessionBudget(sessionKeyId) : { remaining: "unknown" };
      return json(budget);
    },
  );

  server.registerTool(
    "fabric_reload",
    {
      title: "Reload catalog",
      description: "Hot-reload api__* and wf__* tools from the live gateway catalog.",
      inputSchema: {},
    },
    async () => {
      deps.catalog.invalidateCache();
      return json({ ok: true, message: "cache invalidated — restart or call registerCatalog to rebuild tools" });
    },
  );

  server.registerTool(
    "list_skills",
    {
      title: "List skills",
      description: "List all published skills in the catalog.",
      inputSchema: {},
    },
    async () => json({ skills: (await deps.catalog.loadCatalog(true)).apis }),
  );

  server.registerTool(
    "get_skill",
    {
      title: "Get skill",
      description: "Fetch one skill manifest by slug.",
      inputSchema: {
        slug: z.string(),
        version: z.string().optional(),
      },
    },
    async ({ slug, version }) => {
      const base = deps.gatewayUrl.replace(/\/+$/, "");
      const q = version ? `?version=${encodeURIComponent(version)}` : "";
      const r = await fetch(`${base}/skills/${encodeURIComponent(slug)}${q}`);
      if (r.status === 404) return json({ error: `skill not found: ${slug}` });
      return json(await r.json());
    },
  );
}

export async function registerCatalog(
  server: McpServer,
  deps: FabricRegisterDeps,
): Promise<{ apis: string[]; workflows: string[] }> {
  const { apis, workflows } = await deps.catalog.loadCatalog(true);
  const invoke = createSkillInvoker(deps.gatewayUrl);
  const apiNames: string[] = [];
  for (const a of apis) {
    try {
      apiNames.push(registerSkillTool(server, a, invoke));
    } catch (e) {
      console.error(`skip API '${a.slug}': ${(e as Error).message}`);
    }
  }
  const wfNames: string[] = [];
  for (const w of workflows) {
    try {
      registerWorkflowTool(server, w, deps);
      wfNames.push(`wf__${w.slug ?? w.id}`);
    } catch (e) {
      console.error(`skip workflow '${w.slug}': ${(e as Error).message}`);
    }
  }
  return { apis: apiNames, workflows: wfNames };
}

export async function buildFabricServer(
  McpServerCtor: typeof McpServer,
  deps: FabricRegisterDeps,
): Promise<{ server: McpServer; registered: { apis: string[]; workflows: string[] } }> {
  const server = new McpServerCtor({ name: "caspier-fabric", version: "0.2.0" });
  registerBuiltins(server, deps);
  const registered = await registerCatalog(server, deps);
  return { server, registered };
}
