import { describe, expect, test } from "bun:test";
import { CatalogService, slugify } from "./service.ts";
import { CatalogError } from "./types.ts";

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

Body.
`;
}

describe("slugify", () => {
  test("makes URL-safe slugs", () => {
    expect(slugify("Hello Weather")).toBe("hello-weather");
    expect(slugify("  A/B  C! ")).toBe("a-b-c");
  });
});

describe("CatalogService.publish", () => {
  test("publishes a valid skill", async () => {
    const svc = new CatalogService();
    const unit = await svc.publish(skill());
    expect(unit.id).toBe("hello-weather@0.1.0");
    expect(unit.slug).toBe("hello-weather");
    expect(unit.manifest.pricing.asset).toBe("USDC");
  });

  test("rejects invalid manifest with details", async () => {
    const svc = new CatalogService();
    const bad = skill("Hello", "not-semver");
    try {
      await svc.publish(bad);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CatalogError);
      const e = err as CatalogError;
      expect(e.code).toBe("INVALID_MANIFEST");
      expect((e.details ?? []).some((d) => d.startsWith("version"))).toBe(true);
    }
  });

  test("rejects duplicate slug@version", async () => {
    const svc = new CatalogService();
    await svc.publish(skill());
    await expect(svc.publish(skill())).rejects.toMatchObject({ code: "DUPLICATE_VERSION" });
  });

  test("allows a new version of the same skill", async () => {
    const svc = new CatalogService();
    await svc.publish(skill("Hello Weather", "0.1.0"));
    const v2 = await svc.publish(skill("Hello Weather", "0.2.0"));
    expect(v2.id).toBe("hello-weather@0.2.0");
  });
});

describe("CatalogService.get / list", () => {
  test("gets latest version by default", async () => {
    const svc = new CatalogService();
    await svc.publish(skill("Hello Weather", "0.1.0"));
    await svc.publish(skill("Hello Weather", "0.2.0"));
    const latest = await svc.get("hello-weather");
    expect(latest?.version).toBe("0.2.0");
  });

  test("gets a specific version", async () => {
    const svc = new CatalogService();
    await svc.publish(skill("Hello Weather", "0.1.0"));
    await svc.publish(skill("Hello Weather", "0.2.0"));
    const pinned = await svc.get("hello-weather", "0.1.0");
    expect(pinned?.version).toBe("0.1.0");
  });

  test("returns undefined for unknown slug", async () => {
    const svc = new CatalogService();
    expect(await svc.get("nope")).toBeUndefined();
  });

  test("lists summaries", async () => {
    const svc = new CatalogService();
    await svc.publish(skill("Alpha Skill", "1.0.0"));
    await svc.publish(skill("Beta Skill", "1.0.0"));
    const list = await svc.list();
    expect(list.length).toBe(2);
    expect(list[0]).toHaveProperty("pricePerCall");
    expect(list[0]).not.toHaveProperty("body");
  });
});
