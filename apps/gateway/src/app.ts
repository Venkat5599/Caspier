import { Hono } from "hono";
import { CatalogService, CatalogError } from "@fabric/catalog";
import { ManifestParseError } from "@fabric/manifest";
import { createLogger, type Logger } from "./logger.ts";

export interface AppDeps {
  catalog?: CatalogService;
  logger?: Logger;
}

/**
 * Build the gateway HTTP app. Dependencies are injected for testability.
 * Routes the publish → discover loop; auth, rate-limit, and payments land later.
 */
export function createApp(deps: AppDeps = {}) {
  const catalog = deps.catalog ?? new CatalogService();
  const logger = deps.logger ?? createLogger();
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok", service: "gateway" }));

  // Publish a SKILL.md (raw Markdown body).
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

  // List published skills (summaries).
  app.get("/skills", async (c) => c.json({ skills: await catalog.list() }));

  // Get a skill by slug (latest version, or ?version=).
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

  app.notFound((c) => c.json({ error: "not found" }, 404));

  return app;
}
