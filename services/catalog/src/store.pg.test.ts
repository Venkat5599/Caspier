import { SQL } from "bun";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { CatalogService } from "./service.ts";
import { PgCatalogStore } from "./store.pg.ts";
import { migrate } from "./migrate.ts";

const DB_URL = process.env.DATABASE_URL;
// Integration tests run only when a Postgres is wired (local docker / CI service).
const suite = DB_URL ? describe : describe.skip;

function skill(name = "Pg Skill", version = "1.0.0"): string {
  return `---
name: ${name}
version: ${version}
description: pg-backed skill.
runtime: code
pricing:
  pricePerCall: "5"
  asset: USDC
inputSchema:
  type: object
outputSchema:
  type: object
scope:
  egress:
    - api.example.com
---
# ${name}
Body.`;
}

suite("PgCatalogStore (integration)", () => {
  const sql = new SQL(DB_URL!);

  beforeEach(async () => {
    await migrate(sql);
    await sql`TRUNCATE catalog.units`;
  });

  afterAll(async () => {
    await sql.end();
  });

  test("publishes and reads back through the service", async () => {
    const svc = new CatalogService(new PgCatalogStore(sql));
    const unit = await svc.publish(skill("Pg Skill", "1.0.0"));
    expect(unit.id).toBe("pg-skill@1.0.0");

    const got = await svc.get("pg-skill");
    expect(got?.version).toBe("1.0.0");
    expect(got?.manifest.pricing.asset).toBe("USDC");
    expect(got?.body).toContain("Body.");
  });

  test("rejects duplicate slug@version", async () => {
    const svc = new CatalogService(new PgCatalogStore(sql));
    await svc.publish(skill());
    await expect(svc.publish(skill())).rejects.toMatchObject({ code: "DUPLICATE_VERSION" });
  });

  test("returns latest version by semver", async () => {
    const svc = new CatalogService(new PgCatalogStore(sql));
    await svc.publish(skill("Pg Skill", "1.0.0"));
    await svc.publish(skill("Pg Skill", "1.2.0"));
    await svc.publish(skill("Pg Skill", "1.10.0"));
    const latest = await svc.get("pg-skill");
    expect(latest?.version).toBe("1.10.0");
  });

  test("persists across store instances (durability)", async () => {
    const a = new CatalogService(new PgCatalogStore(sql));
    await a.publish(skill("Durable", "2.0.0"));
    const b = new CatalogService(new PgCatalogStore(sql));
    const got = await b.get("durable", "2.0.0");
    expect(got?.id).toBe("durable@2.0.0");
  });
});
