import { describe, expect, it } from "bun:test";
import { buildEndpointUrl, ExecutionService } from "./service.ts";
import type { CatalogUnit } from "@fabric/catalog";

function unit(overrides: { slug?: string; endpoint?: string; egress?: string[] }): CatalogUnit {
  const slug = overrides.slug ?? "test-skill";
  return {
    id: `${slug}@0.1.0`,
    slug,
    version: "0.1.0",
    body: "",
    createdAt: new Date().toISOString(),
    manifest: {
      name: slug,
      version: "0.1.0",
      description: "test",
      runtime: "code",
      pricing: { pricePerCall: "0", asset: "ETH" },
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      ...(overrides.endpoint ? { endpoint: overrides.endpoint } : {}),
      scope: { egress: overrides.egress ?? ["api.example.com"] },
    },
  };
}

describe("buildEndpointUrl", () => {
  it("substitutes placeholders from the input", () => {
    expect(buildEndpointUrl("https://api.example.com/v1/{id}", { id: "abc" })).toBe(
      "https://api.example.com/v1/abc",
    );
  });

  it("url-encodes substituted values", () => {
    expect(buildEndpointUrl("https://api.example.com/{q}", { q: "a b/c" })).toBe(
      "https://api.example.com/a%20b%2Fc",
    );
  });

  it("appends unconsumed input keys as query params", () => {
    expect(buildEndpointUrl("https://api.example.com/v1/{id}", { id: "abc", limit: 5 })).toBe(
      "https://api.example.com/v1/abc?limit=5",
    );
  });

  it("preserves query params already in the template", () => {
    const url = buildEndpointUrl("https://api.example.com/p?vs=usd", { ids: "bitcoin" });
    expect(url).toContain("vs=usd");
    expect(url).toContain("ids=bitcoin");
  });

  it("throws when a placeholder has no matching input", () => {
    expect(() => buildEndpointUrl("https://api.example.com/{id}", {})).toThrow(
      "endpoint requires input 'id'",
    );
  });

  it("ignores null and undefined inputs rather than sending 'null'", () => {
    expect(buildEndpointUrl("https://api.example.com/v1", { a: null, b: undefined, c: 1 })).toBe(
      "https://api.example.com/v1?c=1",
    );
  });
});

describe("ExecutionService", () => {
  const execution = new ExecutionService();

  it("rejects a skill with neither an endpoint nor a built-in handler", async () => {
    await expect(execution.run(unit({ slug: "unknown-skill" }), {})).rejects.toThrow(
      /declares no endpoint and has no built-in handler/,
    );
  });

  it("denies egress to a host outside scope.egress", async () => {
    const u = unit({
      slug: "off-scope",
      endpoint: "https://evil.example.org/data",
      egress: ["api.example.com"],
    });
    await expect(execution.run(u, {})).rejects.toThrow(/egress denied/);
  });
});
