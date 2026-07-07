# Plan — Brick #3: `@fabric/mcp-server` (catalog as MCP tools)

## Context

Agent Fabric's pitch is "SKILL.md served as a REST **and MCP** endpoint." Bricks #1–#2 shipped the REST half: `@fabric/manifest` (parse/validate) and `@fabric/catalog` + `@fabric/gateway` (publish→discover over HTTP, 32 tests, live-verified). This brick adds the **MCP half** so AI agents (Claude/ChatGPT) can discover and fetch published skills as native tools.

Architecture choice: the MCP server is a **thin read-only client over the gateway** (single source of truth for the catalog), not a second in-memory store. Base URL from env, fetch injectable for tests.

Most of the code is already drafted on disk (pre-plan-mode) and needs finishing + verification:
- `apps/mcp-server/src/catalogClient.ts` — HTTP client (`list`, `get`), injectable `FetchLike`. written
- `apps/mcp-server/src/tools.ts` — pure handlers `listSkills` / `getSkill` returning MCP `ToolResult`. written
- `apps/mcp-server/src/server.ts` — `createServer(client)` registers `list_skills` + `get_skill` via `@modelcontextprotocol/sdk` `McpServer.registerTool` + zod input schemas. written
- `apps/mcp-server/package.json` / `tsconfig.json` — deps (`@modelcontextprotocol/sdk`, `zod`, `@fabric/catalog`) + extends base. written

## Remaining work

1. **`apps/mcp-server/src/index.ts`** — replace scaffold stub with stdio wiring: read `GATEWAY_URL` (default `http://localhost:8080`), build `CatalogClient`, `createServer`, connect `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`.
2. **`apps/mcp-server/src/tools.test.ts`** — unit-test `listSkills` / `getSkill` with a stub `FetchLike` (success, 404 not-found, network error → `isError`). Test `CatalogClient` URL building + 404→undefined.
3. **Verify SDK API** — confirm `registerTool` signature + `McpServer`/`StdioServerTransport` import paths against the installed `@modelcontextprotocol/sdk` version; adjust if the SDK uses `server.tool(...)` instead.
4. **Install + gates** — `bun install` (links workspace + pulls SDK/zod), `bun --filter @fabric/mcp-server typecheck`, `bun test apps/mcp-server`, then full-repo `bun run typecheck` + `bun run test`.
5. **Live smoke** — start gateway (`GATEWAY_PORT=8090`), publish the example skill, run the MCP server pointed at it, and exercise tools (either via a tiny in-process `client.list()` call or an MCP inspector handshake) to confirm end-to-end discovery.
6. **Commit + push** — `feat(mcp-server): expose catalog as MCP tools (list_skills, get_skill)` → `origin/main`.

## Files

- New/finish: `apps/mcp-server/src/{index.ts,tools.test.ts}` (+ already-drafted `catalogClient.ts`, `tools.ts`, `server.ts`, `package.json`, `tsconfig.json`).
- Reuse: types from `@fabric/catalog` (`CatalogUnit`, `CatalogUnitSummary`); no changes to manifest/catalog/gateway.

## Verification

- `bun run typecheck` → all workspaces exit 0.
- `bun run test` → existing 32 + new mcp-server tests pass.
- Live: gateway up + example skill published; MCP `list_skills` returns the summary and `get_skill {slug:"hello-weather"}` returns the manifest+body; unknown slug → `isError`.

## Next bricks (not this PR)
- #4 `@fabric/web`: replace Bastion landing with a marketplace UI wired to the gateway.
- #5 Postgres `CatalogStore` (durability; needs `docker compose up`).
- #6 x402 metering — **first brick that needs the pending chain decision** (Cronos default vs other EVM).
