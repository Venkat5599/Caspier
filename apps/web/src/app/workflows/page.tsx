import { Workflow, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  { kind: "x402 call", label: "Fetch market data" },
  { kind: "condition", label: "If volatility > threshold" },
  { kind: "skill", label: "Call rebalance skill" },
  { kind: "on-chain", label: "Submit via session key" },
];

export default function WorkflowsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Workflows</h1>
          <p className="mt-1 text-muted">
            Compose skills, x402 calls, and on-chain actions into reusable, permissionable
            automations agents can run.
          </p>
        </div>
        <Button variant="outline" disabled title="Coming soon">
          <Plus className="h-4 w-4" /> New workflow
        </Button>
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-accent" /> Example: regime rebalance
          </CardTitle>
          <CardDescription>A four-step template, bounded by a Casper session key.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border font-mono text-xs text-muted">
                  {i + 1}
                </span>
                <Badge variant="accent">{s.kind}</Badge>
                <span className="text-sm">{s.label}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <p className="mt-6 text-center font-mono text-xs text-muted">
        Visual workflow builder lands with the workflow-fabric brick.
      </p>
    </div>
  );
}
