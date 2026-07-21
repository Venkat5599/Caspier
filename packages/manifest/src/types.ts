// SKILL.md specification: the unit-definition contract.
// A SKILL.md is Markdown with YAML frontmatter describing a callable, metered unit.

/** Runtime engine that executes the skill body. Decision pending — see docs/SANDBOX.md. */
export type RuntimeEngine = "llm" | "code" | "hybrid";

export const RUNTIME_ENGINES: readonly RuntimeEngine[] = ["llm", "code", "hybrid"];

/** Scope the skill is permitted to act within (enforced by the sandbox + session key). */
export interface SkillScope {
  /** Hosts the sandbox may reach (egress allowlist). At least one entry required. */
  egress: string[];
  /** On-chain contracts/methods the skill may call, if any. */
  contracts?: string[];
  /** Max spend per call, in the settlement asset's smallest unit (stringified integer). */
  maxSpendPerCall?: string;
}

/** Pricing for a single invocation. */
export interface SkillPricing {
  /** Price per call, in the settlement asset's smallest unit (stringified integer, >= 0). */
  pricePerCall: string;
  /** Settlement asset symbol (e.g. USDC). */
  asset: string;
}

/** Parsed SKILL.md frontmatter. */
export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  runtime: RuntimeEngine;
  pricing: SkillPricing;
  /** JSON Schema for the input payload. */
  inputSchema: Record<string, unknown>;
  /** JSON Schema for the output payload. */
  outputSchema: Record<string, unknown>;
  /** Tools the skill declares it will use. */
  tools?: string[];
  /**
   * Upstream URL this skill proxies, with `{name}` placeholders filled from the
   * input payload. Unreferenced input keys are appended as query parameters.
   * The host must appear in `scope.egress`; the sandbox rejects it otherwise.
   *
   * Skills without an endpoint need a built-in handler registered by slug.
   */
  endpoint?: string;
  scope: SkillScope;
}

/** A parsed SKILL.md: structured manifest plus the Markdown body. */
export interface ParsedSkill {
  manifest: SkillManifest;
  body: string;
}

/** Result of validating a manifest. */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Thrown when a SKILL.md cannot be parsed (malformed frontmatter, bad YAML). */
export class ManifestParseError extends Error {
  override name = "ManifestParseError";
}
