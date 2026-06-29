import { loadSkill } from "@fabric/manifest";
import { InMemoryCatalogStore } from "./store.memory.ts";
import {
  CatalogError,
  type CatalogStore,
  type CatalogUnit,
  type CatalogUnitSummary,
} from "./types.ts";

/** Derive a URL-safe slug from a manifest name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSummary(u: CatalogUnit): CatalogUnitSummary {
  return {
    id: u.id,
    slug: u.slug,
    version: u.version,
    name: u.manifest.name,
    description: u.manifest.description,
    pricePerCall: u.manifest.pricing.pricePerCall,
    asset: u.manifest.pricing.asset,
    createdAt: u.createdAt,
  };
}

/** Catalog domain logic: publish (validate via manifest), list, get. Transport-agnostic. */
export class CatalogService {
  constructor(private readonly store: CatalogStore = new InMemoryCatalogStore()) {}

  /**
   * Publish a SKILL.md. Parses and validates the manifest; rejects invalid or
   * duplicate `{slug}@{version}`. Returns the stored unit on success.
   *
   * @throws {CatalogError} INVALID_MANIFEST | DUPLICATE_VERSION
   */
  async publish(source: string): Promise<CatalogUnit> {
    const { parsed, validation } = loadSkill(source);
    if (!validation.ok) {
      throw new CatalogError("manifest validation failed", "INVALID_MANIFEST", validation.errors);
    }

    const slug = slugify(parsed.manifest.name);
    const version = parsed.manifest.version;
    const id = `${slug}@${version}`;

    if (await this.store.has(id)) {
      throw new CatalogError(`${id} already published`, "DUPLICATE_VERSION");
    }

    const unit: CatalogUnit = {
      id,
      slug,
      version,
      manifest: parsed.manifest,
      body: parsed.body,
      createdAt: new Date().toISOString(),
    };
    await this.store.put(unit);
    return unit;
  }

  /** Get a unit by slug (latest version unless `version` given). */
  async get(slug: string, version?: string): Promise<CatalogUnit | undefined> {
    return this.store.getBySlug(slug, version);
  }

  /** List published units as summaries, newest first. */
  async list(): Promise<CatalogUnitSummary[]> {
    const units = await this.store.list();
    return units
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toSummary);
  }
}
