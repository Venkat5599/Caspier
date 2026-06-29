import { Workflow, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  { kind: "x402 call", label: "Fetch market data", badge: "primary" as const },
  { kind: "condition", label: "If volatility > threshold", badge: "default" as const },
  { kind: "skill", label: "Call rebalance skill", badge: "accent" as const },
  { kind: "on-chain", label: "Submit via session key", badge: "primary" as const },
];

export default function WorkflowsPage() {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-muted">
            Compose skills, x402 calls, and on-chain actions into reusable, permissionable
            automations agents can run.
          </p>
        </div>
        <Button variant="outline" disabled title="Coming soon">
          <Plus className="h-4 w-4" /> New workflow
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" /> Example: regime rebalance
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
                <Badge variant={s.badge}>{s.kind}</Badge>
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
