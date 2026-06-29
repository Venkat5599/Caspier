import {
  RUNTIME_ENGINES,
  type RuntimeEngine,
  type SkillManifest,
  type ValidationResult,
} from "./types.ts";

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const NON_NEG_INT_RE = /^\d+$/;
// Conservative hostname check for egress allowlist entries.
const HOST_RE = /^(\*\.)?([a-z0-9-]+\.)+[a-z]{2,}$/i;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/**
 * Validate a parsed manifest against the SKILL.md contract.
 *
 * Checks required fields, types, enum membership, version format, numeric
 * pricing, and a non-empty egress allowlist. Returns all problems found rather
 * than throwing, so callers can surface a complete list to publishers.
 */
export function validateManifest(manifest: SkillManifest): ValidationResult {
  const errors: string[] = [];
  const m = manifest as unknown as Record<string, unknown>;

  // name
  if (typeof m.name !== "string" || m.name.trim() === "") {
    errors.push("name: required non-empty string");
  }

  // version
  if (typeof m.version !== "string" || !SEMVER_RE.test(m.version)) {
    errors.push("version: required semver string (e.g. 1.0.0)");
  }

  // description
  if (typeof m.description !== "string" || m.description.trim() === "") {
    errors.push("description: required non-empty string");
  }

  // runtime
  if (!RUNTIME_ENGINES.includes(m.runtime as RuntimeEngine)) {
    errors.push(`runtime: must be one of ${RUNTIME_ENGINES.join(" | ")}`);
  }

  // pricing
  if (!isPlainObject(m.pricing)) {
    errors.push("pricing: required object { pricePerCall, asset }");
  } else {
    const { pricePerCall, asset } = m.pricing;
    if (typeof pricePerCall !== "string" || !NON_NEG_INT_RE.test(pricePerCall)) {
      errors.push("pricing.pricePerCall: required non-negative integer string (smallest unit)");
    }
    if (typeof asset !== "string" || asset.trim() === "") {
      errors.push("pricing.asset: required non-empty string (e.g. USDC)");
    }
  }

  // schemas
  if (!isPlainObject(m.inputSchema)) {
    errors.push("inputSchema: required JSON Schema object");
  }
  if (!isPlainObject(m.outputSchema)) {
    errors.push("outputSchema: required JSON Schema object");
  }

  // tools (optional)
  if (m.tools !== undefined && !isStringArray(m.tools)) {
    errors.push("tools: must be an array of strings when present");
  }

  // scope
  if (!isPlainObject(m.scope)) {
    errors.push("scope: required object { egress: string[] }");
  } else {
    const { egress, contracts, maxSpendPerCall } = m.scope;
    if (!isStringArray(egress) || egress.length === 0) {
      errors.push("scope.egress: required non-empty array of allowed hosts");
    } else {
      for (const host of egress) {
        if (!HOST_RE.test(host)) {
          errors.push(`scope.egress: '${host}' is not a valid host (use bare host or *.domain)`);
        }
      }
    }
    if (contracts !== undefined && !isStringArray(contracts)) {
      errors.push("scope.contracts: must be an array of strings when present");
    }
    if (
      maxSpendPerCall !== undefined &&
      (typeof maxSpendPerCall !== "string" || !NON_NEG_INT_RE.test(maxSpendPerCall))
    ) {
      errors.push("scope.maxSpendPerCall: non-negative integer string when present");
    }
  }

  return { ok: errors.length === 0, errors };
}
