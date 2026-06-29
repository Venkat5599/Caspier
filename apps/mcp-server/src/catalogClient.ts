import type { CatalogUnit, CatalogUnitSummary } from "@fabric/catalog";

/** Minimal fetch signature so tests can inject a stub. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Read-only HTTP client over the gateway's catalog endpoints (single source of truth). */
export class CatalogClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async list(): Promise<CatalogUnitSummary[]> {
    const res = await this.fetchImpl(`${this.baseUrl}/skills`);
    if (!res.ok) throw new Error(`catalog list failed: ${res.status}`);
    const body = (await res.json()) as { skills: CatalogUnitSummary[] };
    return body.skills;
  }

  /** Get a unit by slug (latest, or pinned version). Returns undefined on 404. */
  async get(slug: string, version?: string): Promise<CatalogUnit | undefined> {
    const q = version ? `?version=${encodeURIComponent(version)}` : "";
    const res = await this.fetchImpl(`${this.baseUrl}/skills/${encodeURIComponent(slug)}${q}`);
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`catalog get failed: ${res.status}`);
    return (await res.json()) as CatalogUnit;
  }
}
