import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CatalogClient } from "./catalogClient.ts";
import { getSkill, invokeSkill, listSkills } from "./tools.ts";

export function createServer(client: CatalogClient, gatewayUrl: string): McpServer {
  const server = new McpServer({
    name: "agent-fabric",
    version: "0.2.0",
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

  server.registerTool(
    "invoke_skill",
    {
      title: "Invoke skill",
      description:
        "Call a metered skill via POST /s/:slug — handles x402 402 quote and auto-pay, returns result + deploy hash.",
      inputSchema: {
        slug: z.string().describe("Skill slug, e.g. 'hello-weather'."),
        input: z.record(z.unknown()).optional().describe("JSON input matching the skill inputSchema."),
        version: z.string().optional(),
      },
    },
    async (args) => invokeSkill(gatewayUrl, args),
  );

  return server;
}
