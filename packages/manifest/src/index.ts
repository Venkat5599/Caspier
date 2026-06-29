// @fabric/manifest — SKILL.md spec, parser, and validator.
export * from "./types.ts";
export { parseSkill } from "./parse.ts";
export { validateManifest } from "./validate.ts";

import { parseSkill } from "./parse.ts";
import { validateManifest } from "./validate.ts";
import type { ParsedSkill, ValidationResult } from "./types.ts";

/** Parse and validate in one step. Returns the parsed skill plus the validation result. */
export function loadSkill(source: string): { parsed: ParsedSkill; validation: ValidationResult } {
  const parsed = parseSkill(source);
  const validation = validateManifest(parsed.manifest);
  return { parsed, validation };
}
