import { SQL } from "bun";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dir, "..", "migrations");

/** Split a .sql file into individual statements. Strips `--` line comments first
 *  so a leading comment can't swallow the statement that follows it. */
export function statements(sqlText: string): string[] {
  const withoutComments = sqlText
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Apply every migration file in order. Idempotent (uses IF NOT EXISTS DDL). */
export async function migrate(sql: SQL): Promise<string[]> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const file of files) {
    const text = await Bun.file(join(MIGRATIONS_DIR, file)).text();
    for (const stmt of statements(text)) {
      await sql.unsafe(stmt);
    }
    applied.push(file);
  }
  return applied;
}

// Runnable entry: `bun services/catalog/src/migrate.ts`
if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const sql = new SQL(url);
  const applied = await migrate(sql);
  console.log(`migrations applied: ${applied.join(", ") || "(none)"}`);
  await sql.end();
}
