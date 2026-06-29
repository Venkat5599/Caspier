import { describe, expect, test } from "bun:test";
import { statements } from "./migrate.ts";

describe("statements", () => {
  test("keeps the statement after a leading comment", () => {
    const sql = `-- a comment
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE TABLE catalog.units (id text);`;
    const out = statements(sql);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe("CREATE SCHEMA IF NOT EXISTS catalog");
    expect(out[1]?.startsWith("CREATE TABLE")).toBe(true);
  });

  test("drops blank and comment-only lines", () => {
    const sql = `-- header

-- another

SELECT 1;
`;
    expect(statements(sql)).toEqual(["SELECT 1"]);
  });

  test("parses the real migration into ordered statements", async () => {
    const text = await Bun.file(
      new URL("../migrations/001_init.sql", import.meta.url),
    ).text();
    const out = statements(text);
    expect(out[0]).toContain("CREATE SCHEMA");
    expect(out.some((s) => s.includes("CREATE TABLE"))).toBe(true);
    expect(out.some((s) => s.includes("CREATE INDEX"))).toBe(true);
  });
});
