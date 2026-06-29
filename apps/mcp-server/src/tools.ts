import type { CatalogClient } from "./catalogClient.ts";

/** MCP tool result shape (text content). Index signature matches the SDK's CallToolResult. */
export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  [key: string]: unknown;
}

function text(value: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/**
 * Handler for `list_skills`: returns catalog summaries an agent can browse.
 * Pure function (client injected) so it is unit-testable without the MCP runtime.
 */
export async function listSkills(client: CatalogClient): Promise<ToolResult> {
  try {
    return text({ skills: await client.list() });
  } catch (err) {
    return errorResult(`failed to list skills: ${(err as Error).message}`);
  }
}

/** Handler for `get_skill`: returns the manifest + body for one skill, or a not-found error. */
export async function getSkill(
  client: CatalogClient,
  args: { slug: string; version?: string },
): Promise<ToolResult> {
  if (!args.slug || args.slug.trim() === "") {
    return errorResult("slug is required");
  }
  try {
    const unit = await client.get(args.slug, args.version);
    if (!unit) return errorResult(`skill not found: ${args.slug}`);
    return text(unit);
  } catch (err) {
    return errorResult(`failed to get skill: ${(err as Error).message}`);
  }
}
