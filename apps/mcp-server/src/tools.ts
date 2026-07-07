import type { CatalogClient } from "./catalogClient.ts";

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

export async function listSkills(client: CatalogClient): Promise<ToolResult> {
  try {
    return text({ skills: await client.list() });
  } catch (err) {
    return errorResult(`failed to list skills: ${(err as Error).message}`);
  }
}

export async function getSkill(
  client: CatalogClient,
  args: { slug: string; version?: string },
): Promise<ToolResult> {
  if (!args.slug?.trim()) return errorResult("slug is required");
  try {
    const unit = await client.get(args.slug, args.version);
    if (!unit) return errorResult(`skill not found: ${args.slug}`);
    return text(unit);
  } catch (err) {
    return errorResult(`failed to get skill: ${(err as Error).message}`);
  }
}

/** Invoke a metered skill with auto x402 pay (gateway /auto-pay). */
export async function invokeSkill(
  baseUrl: string,
  args: { slug: string; input?: unknown; version?: string },
): Promise<ToolResult> {
  if (!args.slug?.trim()) return errorResult("slug is required");
  try {
    const { status, body } = await fetch(`${baseUrl.replace(/\/+$/, "")}/s/${encodeURIComponent(args.slug)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args.input ?? {}),
    }).then(async (res) => ({ status: res.status, body: await res.json() }));

    if (status === 402) {
      const quote = body as { nonce: string };
      const payRes = await fetch(`${baseUrl.replace(/\/+$/, "")}/s/${encodeURIComponent(args.slug)}/auto-pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nonce: quote.nonce, input: args.input ?? {} }),
      });
      const paid = await payRes.json();
      if (!payRes.ok) return errorResult((paid as { error?: string }).error ?? "auto-pay failed");
      return text(paid);
    }
    if (status >= 400) return errorResult((body as { error?: string }).error ?? `HTTP ${status}`);
    return text(body);
  } catch (err) {
    return errorResult(`invoke failed: ${(err as Error).message}`);
  }
}
