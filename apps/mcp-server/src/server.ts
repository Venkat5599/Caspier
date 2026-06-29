import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CatalogClient } from "./catalogClient.ts";
import { getSkill, listSkills } from "./tools.ts";

/**
 * Build the Agent Fabric MCP server. Exposes the catalog as agent-discoverable
 * tools backed by the gateway. Transport is wired by the caller (stdio/HTTP).
 */
export function createServer(client: CatalogClient): McpServer {
  const server = new McpServer({
    name: "agent-fabric",
    version: "0.1.0",
  });

  server.registerTool(
    "list_skills",
    {
      title: "List skills",
      description: "List all published skills in the Agent Fabric catalog (name, price, summary).",
      inputSchema: {},
    },
    async () => listSkills(client),
  );

  server.registerTool(
    "get_skill",
    {
      title: "Get skill",
      description: "Fetch one skill's manifest and body by slug (optionally a pinned version).",
      inputSchema: {
        slug: z.string().describe("The skill slug, e.g. 'hello-weather'."),
        version: z.string().optional().describe("Optional semver to pin, e.g. '0.1.0'."),
      },
    },
    async (args) => getSkill(client, args),
  );

  return server;
}
