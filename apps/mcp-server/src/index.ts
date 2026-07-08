import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ChainWorker, loadChainConfig } from "@fabric/chain-worker";
import {
  buildFabricServer,
  createCatalogLoader,
  type WorkflowRunnerDeps,
} from "@fabric/fabric-core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:8080";
const chain = new ChainWorker(loadChainConfig());
const catalog = createCatalogLoader(gatewayUrl);

const runnerDeps: WorkflowRunnerDeps = {
  catalog,
  gatewayUrl,
  transfer: async (recipient, amountWei) => {
    const tx = await chain.transfer({ recipientPublicKeyHex: recipient, amountWei });
    return { deployHash: tx.deployHash, demo: tx.demo };
  },
};

const { server, registered } = await buildFabricServer(McpServer, {
  catalog,
  gatewayUrl,
  runnerDeps,
  chainStatus: async () => chain.status(),
  sessionBudget: async () => ({ remaining: "scoped via session keys", unit: "wei" }),
});

await server.connect(new StdioServerTransport());

process.stderr.write(
  `kairos fabric mcp-server connected (gateway: ${gatewayUrl}) · ${registered.apis.length} api__* · ${registered.workflows.length} wf__*\n`,
);
