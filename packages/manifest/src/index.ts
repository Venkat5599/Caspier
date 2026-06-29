// @fabric/manifest
// SKILL.md specification: the unit-definition contract.
// A SKILL.md is Markdown with YAML frontmatter describing a callable, metered unit.

/** Runtime engine that executes the skill body. Decision pending — see docs/SANDBOX.md. */
export type RuntimeEngine = "llm" | "code" | "hybrid";

/** Scope the skill is permitted to act within (enforced by the sandbox + session key). */
export interface SkillScope {
  /** Hosts the sandbox may reach (egress allowlist). */
  egress: string[];
  /** On-chain contracts/methods the skill may call, if any. */
  contracts?: string[];
  /** Max spend per call, in the settlement asset's smallest unit. */
  maxSpendPerCall?: string;
}

/** Pricing for a single invocation. */
export interface SkillPricing {
  /** Price per call, in the settlement asset's smallest unit. */
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
  scope: SkillScope;
}

/** Result of validating a SKILL.md. */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Parse a SKILL.md document into a manifest + body.
 * TODO(phase-5): implement frontmatter + Markdown body parsing.
 */
export function parseSkill(_source: string): { manifest: SkillManifest; body: string } {
  throw new Error("parseSkill not implemented — scaffold");
}

/**
 * Validate a manifest: schema shape, required fields, scope declaration, safety scan.
 * TODO(phase-5): implement.
 */
export function validateManifest(_manifest: SkillManifest): ValidationResult {
  throw new Error("validateManifest not implemented — scaffold");
}
