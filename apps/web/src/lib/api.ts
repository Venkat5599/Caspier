// Typed client for the Agent Fabric gateway.
// Base URL comes from VITE_GATEWAY_URL at build time, defaulting to the live VPS.

const BASE = (import.meta.env.VITE_GATEWAY_URL ?? "http://187.127.137.136:8086").replace(
  /\/+$/,
  "",
);

export interface SkillSummary {
  id: string;
  slug: string;
  version: string;
  name: string;
  description: string;
  pricePerCall: string;
  asset: string;
  createdAt: string;
}

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  runtime: "llm" | "code" | "hybrid";
  pricing: { pricePerCall: string; asset: string };
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  tools?: string[];
  scope: { egress: string[]; contracts?: string[]; maxSpendPerCall?: string };
}

export interface SkillDetail {
  id: string;
  slug: string;
  version: string;
  manifest: SkillManifest;
  body: string;
  createdAt: string;
}

export interface PublishResult {
  id: string;
  slug: string;
  version: string;
}

export interface PublishError {
  error: string;
  code?: string;
  details?: string[];
}

export async function listSkills(): Promise<SkillSummary[]> {
  const res = await fetch(`${BASE}/skills`);
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const body = (await res.json()) as { skills: SkillSummary[] };
  return body.skills;
}

export async function getSkill(slug: string, version?: string): Promise<SkillDetail> {
  const q = version ? `?version=${encodeURIComponent(version)}` : "";
  const res = await fetch(`${BASE}/skills/${encodeURIComponent(slug)}${q}`);
  if (!res.ok) throw new Error(`get failed: ${res.status}`);
  return (await res.json()) as SkillDetail;
}

/** Publish a raw SKILL.md. Resolves with the result, or rejects with a PublishError. */
export async function publishSkill(source: string): Promise<PublishResult> {
  const res = await fetch(`${BASE}/skills`, {
    method: "POST",
    headers: { "content-type": "text/markdown" },
    body: source,
  });
  const body = await res.json();
  if (!res.ok) throw body as PublishError;
  return body as PublishResult;
}

export const gatewayUrl = BASE;
