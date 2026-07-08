import { Hono } from "hono";
import { cors } from "hono/cors";
import { CatalogService, CatalogError, PgCatalogStore } from "@fabric/catalog";
import { ManifestParseError } from "@fabric/manifest";
import { ChainWorker, loadChainConfig } from "@fabric/chain-worker";
import { PaymentService } from "@fabric/payments";
import { ExecutionService } from "@fabric/execution";
import { AuthzService } from "@fabric/authz";
import { createLogger, type Logger } from "./logger.ts";
import { generateWorkflow } from "./workflowGen.ts";
import { handleInvoke } from "./invoke.ts";
import {
  listWorkflows,
  getWorkflow,
  seedBuiltinWorkflows,
  templateX402SkillCall,
  createWorkflow,
} from "./n8n.ts";
import { mountFabricRoutes } from "./fabric/routes.ts";

export function defaultCatalog(): CatalogService {
  if (process.env.DATABASE_URL) {
    return new CatalogService(PgCatalogStore.fromUrl());
  }
  return new CatalogService();
}

export interface AppDeps {
  catalog?: CatalogService;
  chain?: ChainWorker;
  payments?: PaymentService;
  execution?: ExecutionService;
  authz?: AuthzService;
  logger?: Logger;
}

export function createApp(deps: AppDeps = {}) {
  const catalog = deps.catalog ?? defaultCatalog();
  const chain = deps.chain ?? new ChainWorker(loadChainConfig());
  const payments = deps.payments ?? new PaymentService(chain);
  const execution = deps.execution ?? new ExecutionService();
  const authz = deps.authz ?? new AuthzService(chain.publicKeyHex);
  const logger = deps.logger ?? createLogger();
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) =>
    c.json({ status: "ok", service: "gateway", chain: chain.status() }),
  );

  app.get("/chain/status", (c) => c.json(chain.status()));

  app.get("/payments/usage", (c) => c.json({ usage: payments.listUsage() }));

  app.get("/auth/session-keys", (c) => c.json({ keys: authz.list() }));

  app.post("/auth/session-keys", async (c) => {
    const body = (await c.req.json()) as {
      agentPublicKeyHex?: string;
      scope?: { maxSpendPerCall: string; expiresAt: string; allowedContracts?: string[] };
    };
    if (!body.agentPublicKeyHex || !body.scope?.maxSpendPerCall || !body.scope?.expiresAt) {
      return c.json({ error: "agentPublicKeyHex and scope required" }, 400);
    }
    try {
      const key = authz.mint(body.agentPublicKeyHex, body.scope);
      return c.json(key, 201);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  app.delete("/auth/session-keys/:pubkey", async (c) => {
    const rec = authz.revoke(c.req.param("pubkey"));
    if (!rec) return c.json({ error: "not found" }, 404);
    return c.json(rec);
  });

  // --- Catalog ---
  app.post("/skills", async (c) => {
    const source = await c.req.text();
    if (!source.trim()) {
      return c.json({ error: "empty body — POST the SKILL.md as the request body" }, 400);
    }
    try {
      const unit = await catalog.publish(source);
      logger.info("skill published", { id: unit.id });
      return c.json({ id: unit.id, slug: unit.slug, version: unit.version }, 201);
    } catch (err) {
      if (err instanceof CatalogError) {
        const status = err.code === "DUPLICATE_VERSION" ? 409 : 400;
        return c.json({ error: err.message, code: err.code, details: err.details }, status);
      }
      if (err instanceof ManifestParseError) {
        return c.json({ error: err.message, code: "PARSE_ERROR" }, 400);
      }
      logger.error("publish failed", { err: String(err) });
      return c.json({ error: "internal error" }, 500);
    }
  });

  app.post("/skills/seed-demo", async (c) => {
    const demo = `---
name: hello-weather
version: 0.1.0
description: Returns a one-line weather summary for a city.
runtime: code
pricing:
  pricePerCall: "1000"
  asset: ETH
inputSchema:
  type: object
  properties:
    city:
      type: string
outputSchema:
  type: object
  properties:
    summary:
      type: string
scope:
  egress:
    - geocoding-api.open-meteo.com
    - api.open-meteo.com
---
# hello-weather
Demo skill for hackathon invoke flow.`;
    try {
      const unit = await catalog.publish(demo);
      return c.json(unit, 201);
    } catch (err) {
      if (err instanceof CatalogError && err.code === "DUPLICATE_VERSION") {
        return c.json({ slug: "hello-weather", message: "already seeded" });
      }
      return c.json({ error: String(err) }, 400);
    }
  });

  app.get("/skills", async (c) => c.json({ skills: await catalog.list() }));

  app.get("/skills/:slug", async (c) => {
    const slug = c.req.param("slug");
    const version = c.req.query("version");
    const unit = await catalog.get(slug, version);
    if (!unit) return c.json({ error: "not found" }, 404);
    return c.json({
      id: unit.id,
      slug: unit.slug,
      version: unit.version,
      manifest: unit.manifest,
      body: unit.body,
      createdAt: unit.createdAt,
    });
  });

  // --- Skill invocation (x402 metered) ---
  app.post("/s/:slug", async (c) => {
    const slug = c.req.param("slug");
    const unit = await catalog.get(slug, c.req.query("version"));
    if (!unit) return c.json({ error: "skill not found" }, 404);
    return handleInvoke(c, unit, slug, payments, execution, chain, false);
  });

  app.post("/s/:slug/auto-pay", async (c) => {
    const slug = c.req.param("slug");
    const unit = await catalog.get(slug, c.req.query("version"));
    if (!unit) return c.json({ error: "skill not found" }, 404);
    return handleInvoke(c, unit, slug, payments, execution, chain, true);
  });

  // --- n8n ---
  app.get("/workflows", async (c) => {
    try {
      return c.json({ workflows: await listWorkflows() });
    } catch (err) {
      return c.json({ error: (err as Error).message, workflows: [] }, 502);
    }
  });

  app.get("/workflows/:id", async (c) => {
    try {
      const wf = await getWorkflow(c.req.param("id"));
      if (!wf) return c.json({ error: "workflow not found" }, 404);
      return c.json(wf);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 502);
    }
  });

  app.post("/workflows/seed", async (c) => {
    try {
      const created = await seedBuiltinWorkflows();
      return c.json({ created }, 201);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 502);
    }
  });

  app.post("/workflows/templates/:name", async (c) => {
    const name = c.req.param("name");
    try {
      if (name === "x402-skill-call") {
        const wf = await createWorkflow(templateX402SkillCall());
        return c.json(wf, 201);
      }
      return c.json({ error: "unknown template" }, 404);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 502);
    }
  });

  const gatewayUrl = process.env.GATEWAY_PUBLIC_URL ?? "http://localhost:8080";
  mountFabricRoutes(app, { catalog, chain, authz, gatewayUrl });

  app.post("/workflows/generate", async (c) => {
    let prompt = "";
    try {
      const body = (await c.req.json()) as { prompt?: string };
      prompt = (body.prompt ?? "").trim();
    } catch {
      return c.json({ error: "expected JSON body { prompt }" }, 400);
    }
    if (!prompt) return c.json({ error: "prompt is required" }, 400);
    try {
      const result = await generateWorkflow(prompt);
      logger.info("workflow generated", { id: result.id, name: result.name });
      return c.json(result, 201);
    } catch (err) {
      logger.error("workflow generate failed", { err: String(err) });
      return c.json({ error: `could not generate workflow: ${(err as Error).message}` }, 502);
    }
  });

  app.notFound((c) => c.json({ error: "not found" }, 404));
  return app;
}
