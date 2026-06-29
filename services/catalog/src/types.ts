import type { SkillManifest } from "@fabric/manifest";

/** A published, versioned unit in the catalog. */
export interface CatalogUnit {
  /** Stable identifier: `{slug}@{version}`. */
  id: string;
  /** URL-safe name derived from the manifest name. */
  slug: string;
  version: string;
  manifest: SkillManifest;
  /** Markdown body of the SKILL.md. */
  body: string;
  /** ISO timestamp of publication. */
  createdAt: string;
}

/** Public-facing summary (no body) for list views. */
export interface CatalogUnitSummary {
  id: string;
  slug: string;
  version: string;
  name: string;
  description: string;
  pricePerCall: string;
  asset: string;
  createdAt: string;
}

/** Persistence boundary for the catalog. Swappable: in-memory now, Postgres later. */
export interface CatalogStore {
  put(unit: CatalogUnit): Promise<void>;
  /** Latest version for a slug, or all versions if `version` given. */
  getBySlug(slug: string, version?: string): Promise<CatalogUnit | undefined>;
  has(id: string): Promise<boolean>;
  list(): Promise<CatalogUnit[]>;
}

/** Raised when a publish request is rejected. */
export class CatalogError extends Error {
  override name = "CatalogError";
  constructor(
    message: string,
    readonly code: "INVALID_MANIFEST" | "DUPLICATE_VERSION",
    readonly details?: string[],
  ) {
    super(message);
  }
}
