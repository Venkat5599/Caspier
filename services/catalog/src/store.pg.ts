import { SQL } from "bun";
import type { SkillManifest } from "@fabric/manifest";
import { latestBySemver } from "./semver.ts";
import type { CatalogStore, CatalogUnit } from "./types.ts";

interface UnitRow {
  id: string;
  slug: string;
  version: string;
  // jsonb may arrive parsed (object) or raw (string) depending on the driver.
  manifest: SkillManifest | string;
  body: string;
  created_at: Date;
}

function rowToUnit(r: UnitRow): CatalogUnit {
  const manifest =
    typeof r.manifest === "string" ? (JSON.parse(r.manifest) as SkillManifest) : r.manifest;
  return {
    id: r.id,
    slug: r.slug,
    version: r.version,
    manifest,
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/**
 * Postgres-backed catalog store using Bun's native SQL driver.
 * Implements the same {@link CatalogStore} contract as the in-memory store,
 * so the service and gateway are unchanged.
 */
export class PgCatalogStore implements CatalogStore {
  constructor(private readonly sql: SQL) {}

  /** Build a store from a connection string (defaults to DATABASE_URL). */
  static fromUrl(url = process.env.DATABASE_URL): PgCatalogStore {
    if (!url) throw new Error("PgCatalogStore: DATABASE_URL is not set");
    return new PgCatalogStore(new SQL(url));
  }

  async put(unit: CatalogUnit): Promise<void> {
    await this.sql`
      INSERT INTO catalog.units (id, slug, version, manifest, body, created_at)
      VALUES (${unit.id}, ${unit.slug}, ${unit.version},
              ${JSON.stringify(unit.manifest)}::jsonb, ${unit.body}, ${unit.createdAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  async has(id: string): Promise<boolean> {
    const rows = (await this.sql`SELECT 1 FROM catalog.units WHERE id = ${id} LIMIT 1`) as unknown[];
    return rows.length > 0;
  }

  async getBySlug(slug: string, version?: string): Promise<CatalogUnit | undefined> {
    if (version) {
      const rows = (await this.sql`
        SELECT * FROM catalog.units WHERE slug = ${slug} AND version = ${version} LIMIT 1
      `) as UnitRow[];
      return rows[0] ? rowToUnit(rows[0]) : undefined;
    }
    const rows = (await this.sql`SELECT * FROM catalog.units WHERE slug = ${slug}`) as UnitRow[];
    return latestBySemver(rows.map(rowToUnit));
  }

  async list(): Promise<CatalogUnit[]> {
    const rows = (await this.sql`SELECT * FROM catalog.units`) as UnitRow[];
    return rows.map(rowToUnit);
  }
}
