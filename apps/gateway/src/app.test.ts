import { describe, expect, test } from "bun:test";
import { CatalogService } from "@fabric/catalog";
import { createApp } from "./app.ts";

// Hermetic: always inject a fresh in-memory catalog so tests never touch a DB
// even when DATABASE_URL is set in the environment (e.g. CI).
const freshApp = () => createApp({ catalog: new CatalogService() });

function skill(name = "Hello Weather", version = "0.1.0"): string {
  return `---
name: ${name}
version: ${version}
description: Returns a weather summary.
runtime: code
pricing:
  pricePerCall: "1000"
  asset: USDC
inputSchema:
  type: object
outputSchema:
  type: object
scope:
  egress:
    - api.open-meteo.com
---
# ${name}
Body.`;
}

const md = { "content-type": "text/markdown" };

describe("gateway", () => {
  test("GET /health", async () => {
    const app = freshApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  test("POST /skills publishes a valid skill", async () => {
    const app = freshApp();
    const res = await app.request("/skills", { method: "POST", body: skill(), headers: md });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id: "hello-weather@0.1.0", slug: "hello-weather" });
  });

  test("POST /skills rejects invalid manifest with 400 + details", async () => {
    const app = freshApp();
    const res = await app.request("/skills", {
      method: "POST",
      body: skill("Hello", "bad"),
      headers: md,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; details: string[] };
    expect(body.code).toBe("INVALID_MANIFEST");
    expect(body.details.some((d) => d.startsWith("version"))).toBe(true);
  });

  test("POST /skills rejects empty body with 400", async () => {
    const app = freshApp();
    const res = await app.request("/skills", { method: "POST", body: "   ", headers: md });
    expect(res.status).toBe(400);
  });

  test("POST /skills rejects duplicate with 409", async () => {
    const app = freshApp();
    await app.request("/skills", { method: "POST", body: skill(), headers: md });
    const dup = await app.request("/skills", { method: "POST", body: skill(), headers: md });
    expect(dup.status).toBe(409);
  });

  test("GET /skills lists published", async () => {
    const app = freshApp();
    await app.request("/skills", { method: "POST", body: skill("Alpha", "1.0.0"), headers: md });
    const res = await app.request("/skills");
    const body = (await res.json()) as { skills: unknown[] };
    expect(body.skills.length).toBe(1);
  });

  test("GET /skills/:slug returns manifest + body", async () => {
    const app = freshApp();
    await app.request("/skills", { method: "POST", body: skill(), headers: md });
    const res = await app.request("/skills/hello-weather");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: string; manifest: unknown; body: string };
    expect(body.version).toBe("0.1.0");
    expect(body.manifest).toBeDefined();
  });

  test("GET /skills/:slug 404 for unknown", async () => {
    const app = freshApp();
    const res = await app.request("/skills/nope");
    expect(res.status).toBe(404);
  });
});
