import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MCP_CONFIG = `{
  "mcpServers": {
    "agent-fabric": {
      "command": "bun",
      "args": ["apps/mcp-server/src/index.ts"],
      "env": { "GATEWAY_URL": "http://187.127.137.136:8086" }
    }
  }
}`;

const TOOLS = [
  { name: "list_skills", desc: "List all published skills in the catalog (name, price, summary)." },
  { name: "get_skill", desc: "Fetch one skill's manifest and body by slug (optionally a pinned version)." },
];

export default function McpPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="text-3xl font-extrabold tracking-tight">MCP Servers</h1>
      <p className="mt-1 text-muted">
        Every published skill is discoverable as a Model Context Protocol tool. Point any MCP client
        — Claude, ChatGPT — at the Agent Fabric server.
      </p>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Client configuration</CardTitle>
          <CardDescription>Add this to your MCP client config, then restart it.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border bg-bg p-4 font-mono text-xs leading-relaxed text-foreground">
            {MCP_CONFIG}
          </pre>
        </CardContent>
      </Card>

      <h2 className="mt-12 text-lg font-bold tracking-tight">Available tools</h2>
      <div className="mt-4 space-y-3">
        {TOOLS.map((t) => (
          <Card key={t.name}>
            <CardContent className="flex items-center gap-4 p-4">
              <Badge variant="accent">{t.name}</Badge>
              <span className="text-sm text-muted">{t.desc}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
