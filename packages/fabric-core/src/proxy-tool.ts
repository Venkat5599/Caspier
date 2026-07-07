import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SkillApiRow, PaymentProof } from "./types.ts";
import type { CatalogLoader } from "./catalog.ts";

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export type InvokeSkillFn = (
  slug: string,
  input: Record<string, unknown>,
  payment?: PaymentProof,
) => Promise<{ status: number; body: unknown }>;

function inputSchemaFromManifest(api: SkillApiRow): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const props = (api.inputSchema as { properties?: Record<string, { description?: string }> })?.properties ?? {};
  for (const [name, def] of Object.entries(props)) {
    shape[name] = z.unknown().optional().describe(def.description ?? name);
  }
  shape.payment = z
    .object({ nonce: z.string(), deployHash: z.string().optional(), payer: z.string().optional() })
    .optional()
    .describe("x402 payment proof echoing a quote nonce");
  return shape;
}

export function registerSkillTool(
  server: McpServer,
  api: SkillApiRow,
  invoke: InvokeSkillFn,
): string {
  const name = `api__${api.slug}`;
  const price = api.pricePerCall;

  server.registerTool(
    name,
    {
      title: api.name,
      description: `${api.description}${price !== "0" ? ` · x402 ${price} ${api.asset} per call` : " · free"}`,
      inputSchema: inputSchemaFromManifest(api),
    },
    async (args: Record<string, unknown>) => {
      const payment = args.payment as PaymentProof | undefined;
      const { payment: _drop, ...callArgs } = args;

      if (price !== "0" && !payment) {
        const probe = await invoke(api.slug, callArgs);
        if (probe.status === 402) {
          return json({
            status: "402 payment required",
            quote: probe.body,
            hint: `retry ${name} with { payment: { nonce, deployHash } }`,
          });
        }
        return json({ status: probe.status, body: probe.body });
      }

      const res = await invoke(api.slug, callArgs, payment);
      return json({ status: res.status, body: res.body });
    },
  );
  return name;
}

export async function invokeSkillViaGateway(
  gatewayUrl: string,
  slug: string,
  input: Record<string, unknown>,
  payment?: PaymentProof,
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: number; body: unknown }> {
  const base = gatewayUrl.replace(/\/+$/, "");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (payment?.deployHash) {
    headers["x-payment-proof"] = payment.deployHash;
    headers["x-payment-nonce"] = payment.nonce;
  }

  const res = await fetchImpl(`${base}/s/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export function createSkillInvoker(gatewayUrl: string, fetchImpl?: typeof fetch): InvokeSkillFn {
  return (slug, input, payment) => invokeSkillViaGateway(gatewayUrl, slug, input, payment, fetchImpl);
}
