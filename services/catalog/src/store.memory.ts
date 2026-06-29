import type { CatalogStore, CatalogUnit } from "./types.ts";

/** Compare two semver strings (`a.b.c`). Returns >0 when `a` is newer. */
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** In-memory catalog store. Default for dev/tests; replaced by Postgres in Track A. */
export class InMemoryCatalogStore implements CatalogStore {
  private readonly byId = new Map<string, CatalogUnit>();

  async put(unit: CatalogUnit): Promise<void> {
    this.byId.set(unit.id, unit);
  }

  async has(id: string): Promise<boolean> {
    return this.byId.has(id);
  }

  async getBySlug(slug: string, version?: string): Promise<CatalogUnit | undefined> {
    const versions = [...this.byId.values()].filter((u) => u.slug === slug);
    if (versions.length === 0) return undefined;
    if (version) return versions.find((u) => u.version === version);
    // Latest = highest semver (deterministic regardless of publish timing).
    return versions.sort((a, b) => compareSemver(b.version, a.version))[0];
  }

  async list(): Promise<CatalogUnit[]> {
    return [...this.byId.values()];
  }
}
