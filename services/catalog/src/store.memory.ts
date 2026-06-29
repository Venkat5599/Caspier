import { latestBySemver } from "./semver.ts";
import type { CatalogStore, CatalogUnit } from "./types.ts";

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
    return latestBySemver(versions);
  }

  async list(): Promise<CatalogUnit[]> {
    return [...this.byId.values()];
  }
}
