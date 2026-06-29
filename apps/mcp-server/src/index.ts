import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CatalogClient } from "./catalogClient.ts";
import { createServer } from "./server.ts";

const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:8080";

const client = new CatalogClient(gatewayUrl);
const server = createServer(client);
const transport = new StdioServerTransport();

await server.connect(transport);

// stderr so we never corrupt the stdio JSON-RPC channel on stdout.
process.stderr.write(`agent-fabric mcp-server connected (gateway: ${gatewayUrl})\n`);
