import type { SkillApiRow, WorkflowRow } from "./types.ts";

const TTL_MS = 15_000;

let cache: { at: number; apis: SkillApiRow[]; workflows: WorkflowRow[] } | null = null;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function createCatalogLoader(baseUrl: string, fetchImpl: FetchLike = fetch) {
  const origin = baseUrl.replace(/\/+$/, "");

  async function fetchJson<T>(path: string): Promise<T> {
    const r = await fetchImpl(`${origin}${path}`, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`catalog ${path} -> ${r.status}`);
    return (await r.json()) as T;
  }

  async function loadCatalog(force = false): Promise<{ apis: SkillApiRow[]; workflows: WorkflowRow[] }> {
    if (!force && cache && Date.now() - cache.at < TTL_MS) return cache;
    const [skills, wfs] = await Promise.all([
      fetchJson<{ skills: SkillApiRow[] }>("/skills").catch(() => ({ skills: [] })),
      fetchJson<{ workflows: WorkflowRow[] }>("/fabric/workflows").catch(() => ({ workflows: [] })),
    ]);
    cache = {
      at: Date.now(),
      apis: (skills.skills ?? []).map((s) => ({ ...s, is_public: s.is_public ?? true })),
      workflows: wfs.workflows ?? [],
    };
    return cache;
  }

  async function findApi(slugOrName: string): Promise<SkillApiRow | null> {
    const { apis } = await loadCatalog();
    const k = slugOrName.toLowerCase();
    return apis.find((a) => a.slug === k || a.name.toLowerCase() === k) ?? null;
  }

  async function findWorkflow(slugOrName: string): Promise<WorkflowRow | null> {
    const { workflows } = await loadCatalog();
    const k = slugOrName.toLowerCase();
    return workflows.find((w) => w.slug === k || w.name.toLowerCase() === k) ?? null;
  }

  function invalidateCache(): void {
    cache = null;
  }

  return { loadCatalog, findApi, findWorkflow, invalidateCache };
}

export type CatalogLoader = ReturnType<typeof createCatalogLoader>;
