import { describe, expect, test } from "bun:test";
import { validateManifest } from "./validate.ts";
import { loadSkill } from "./index.ts";
import type { SkillManifest } from "./types.ts";

function base(): SkillManifest {
  return {
    name: "hello-weather",
    version: "0.1.0",
    description: "Returns a weather summary.",
    runtime: "code",
    pricing: { pricePerCall: "1000", asset: "USDC" },
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    scope: { egress: ["api.open-meteo.com"] },
  };
}

describe("validateManifest", () => {
  test("accepts a well-formed manifest", () => {
    const res = validateManifest(base());
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  test("rejects bad version", () => {
    const m = { ...base(), version: "v1" };
    const res = validateManifest(m);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.startsWith("version"))).toBe(true);
  });

  test("rejects unknown runtime", () => {
    const m = { ...base(), runtime: "wasm" as unknown as SkillManifest["runtime"] };
    const res = validateManifest(m);
    expect(res.errors.some((e) => e.startsWith("runtime"))).toBe(true);
  });

  test("rejects non-integer pricePerCall", () => {
    const m = base();
    m.pricing.pricePerCall = "1.5";
    const res = validateManifest(m);
    expect(res.errors.some((e) => e.startsWith("pricing.pricePerCall"))).toBe(true);
  });

  test("rejects empty egress allowlist", () => {
    const m = base();
    m.scope.egress = [];
    const res = validateManifest(m);
    expect(res.errors.some((e) => e.startsWith("scope.egress"))).toBe(true);
  });

  test("rejects malformed egress host", () => {
    const m = base();
    m.scope.egress = ["not a host"];
    const res = validateManifest(m);
    expect(res.errors.some((e) => e.startsWith("scope.egress"))).toBe(true);
  });

  test("accepts wildcard egress host", () => {
    const m = base();
    m.scope.egress = ["*.example.com"];
    expect(validateManifest(m).ok).toBe(true);
  });

  test("collects multiple errors at once", () => {
    const res = validateManifest({} as SkillManifest);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(3);
  });
});

describe("loadSkill", () => {
  test("parses and validates together", () => {
    const src = `---
name: x
version: 1.0.0
description: d
runtime: hybrid
pricing:
  pricePerCall: "0"
  asset: USDC
inputSchema:
  type: object
outputSchema:
  type: object
scope:
  egress:
    - api.example.com
---
body`;
    const { validation } = loadSkill(src);
    expect(validation.ok).toBe(true);
  });
});
