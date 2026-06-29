import { describe, expect, test } from "bun:test";
import { parseSkill } from "./parse.ts";
import { ManifestParseError } from "./types.ts";

const VALID = `---
name: hello-weather
version: 0.1.0
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

# hello-weather

Body text here.
`;

describe("parseSkill", () => {
  test("parses frontmatter and body", () => {
    const { manifest, body } = parseSkill(VALID);
    expect(manifest.name).toBe("hello-weather");
    expect(manifest.runtime).toBe("code");
    expect(manifest.pricing.pricePerCall).toBe("1000");
    expect(manifest.scope.egress).toEqual(["api.open-meteo.com"]);
    expect(body.startsWith("# hello-weather")).toBe(true);
  });

  test("throws on empty input", () => {
    expect(() => parseSkill("   ")).toThrow(ManifestParseError);
  });

  test("throws when frontmatter is missing", () => {
    expect(() => parseSkill("# no frontmatter\njust markdown")).toThrow(ManifestParseError);
  });

  test("throws on invalid YAML", () => {
    const bad = "---\nname: : :\n  - broken\n---\nbody";
    expect(() => parseSkill(bad)).toThrow(ManifestParseError);
  });

  test("throws when frontmatter is not a mapping", () => {
    const seq = "---\n- a\n- b\n---\nbody";
    expect(() => parseSkill(seq)).toThrow(ManifestParseError);
  });

  test("handles CRLF line endings", () => {
    const crlf = VALID.replace(/\n/g, "\r\n");
    const { manifest } = parseSkill(crlf);
    expect(manifest.name).toBe("hello-weather");
  });
});
