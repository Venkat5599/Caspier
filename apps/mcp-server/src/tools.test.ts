import { describe, expect, test } from "bun:test";
import { CatalogClient, type FetchLike } from "./catalogClient.ts";
import { getSkill, listSkills } from "./tools.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Build a stub fetch that records the URL it was called with. */
function stubFetch(handler: (url: string) => Response | Promise<Response>): {
  fetch: FetchLike;
  calls: string[];
} {
  const calls: string[] = [];
  const fetch: FetchLike = async (url) => {
    calls.push(url);
    return handler(url);
  };
  return { fetch, calls };
}

describe("CatalogClient", () => {
  test("list hits /skills and unwraps", async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ skills: [{ slug: "a" }] }));
    const client = new CatalogClient("http://gw:8080/", fetch);
    const skills = await client.list();
    expect(calls[0]).toBe("http://gw:8080/skills");
    expect(skills).toHaveLength(1);
  });

  test("get builds slug + version query", async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ slug: "a", version: "1.0.0" }));
    const client = new CatalogClient("http://gw:8080", fetch);
    await client.get("hello-weather", "0.1.0");
    expect(calls[0]).toBe("http://gw:8080/skills/hello-weather?version=0.1.0");
  });

  test("get returns undefined on 404", async () => {
    const { fetch } = stubFetch(() => jsonResponse({ error: "not found" }, 404));
    const client = new CatalogClient("http://gw:8080", fetch);
    expect(await client.get("nope")).toBeUndefined();
  });

  test("get throws on 500", async () => {
    const { fetch } = stubFetch(() => jsonResponse({ error: "boom" }, 500));
    const client = new CatalogClient("http://gw:8080", fetch);
    await expect(client.get("x")).rejects.toThrow(/500/);
  });
});

describe("listSkills tool", () => {
  test("returns catalog summaries", async () => {
    const { fetch } = stubFetch(() => jsonResponse({ skills: [{ slug: "a", name: "A" }] }));
    const client = new CatalogClient("http://gw", fetch);
    const res = await listSkills(client);
    expect(res.isError).toBeUndefined();
    expect(res.content[0]?.text).toContain("\"slug\": \"a\"");
  });

  test("surfaces errors as isError", async () => {
    const fetch: FetchLike = async () => {
      throw new Error("network down");
    };
    const client = new CatalogClient("http://gw", fetch);
    const res = await listSkills(client);
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("network down");
  });
});

describe("getSkill tool", () => {
  test("requires a slug", async () => {
    const { fetch } = stubFetch(() => jsonResponse({}));
    const client = new CatalogClient("http://gw", fetch);
    const res = await getSkill(client, { slug: "" });
    expect(res.isError).toBe(true);
  });

  test("returns the unit when found", async () => {
    const { fetch } = stubFetch(() => jsonResponse({ slug: "hello-weather", version: "0.1.0" }));
    const client = new CatalogClient("http://gw", fetch);
    const res = await getSkill(client, { slug: "hello-weather" });
    expect(res.isError).toBeUndefined();
    expect(res.content[0]?.text).toContain("hello-weather");
  });

  test("not-found becomes isError", async () => {
    const { fetch } = stubFetch(() => jsonResponse({ error: "not found" }, 404));
    const client = new CatalogClient("http://gw", fetch);
    const res = await getSkill(client, { slug: "ghost" });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("not found: ghost");
  });
});
