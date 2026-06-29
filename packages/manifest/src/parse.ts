import { parse as parseYaml } from "yaml";
import { ManifestParseError, type ParsedSkill, type SkillManifest } from "./types.ts";

/** Matches a leading YAML frontmatter block delimited by `---` lines. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse a SKILL.md document into a structured manifest and Markdown body.
 *
 * The document must begin with a YAML frontmatter block fenced by `---`.
 * This step only shapes the data; semantic validation is `validateManifest`.
 *
 * @throws {ManifestParseError} when frontmatter is missing or YAML is invalid.
 */
export function parseSkill(source: string): ParsedSkill {
  if (typeof source !== "string" || source.trim() === "") {
    throw new ManifestParseError("SKILL.md is empty");
  }

  const match = source.match(FRONTMATTER_RE);
  if (!match) {
    throw new ManifestParseError(
      "missing YAML frontmatter — SKILL.md must start with a '---' fenced block",
    );
  }

  const [, yamlText = "", body = ""] = match;

  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (err) {
    throw new ManifestParseError(`invalid frontmatter YAML: ${(err as Error).message}`);
  }

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ManifestParseError("frontmatter must be a YAML mapping");
  }

  // Shape only — fields are verified by validateManifest. Cast through unknown.
  const manifest = raw as SkillManifest;
  return { manifest, body: body.trim() };
}
