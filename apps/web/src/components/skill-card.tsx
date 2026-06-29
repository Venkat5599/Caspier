import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SkillSummary } from "@/lib/api";

function price(s: SkillSummary): string {
  return s.pricePerCall === "0" ? "free" : `${s.pricePerCall} ${s.asset}`;
}

export function SkillCard({ s }: { s: SkillSummary }) {
  return (
    <Card className="group p-5 transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-bold tracking-tight">{s.name}</h3>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted">
            {s.slug}@{s.version}
          </p>
        </div>
        <Badge variant="accent">{price(s)}</Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted">{s.description}</p>
      <div className="mt-4 flex items-center gap-1.5">
        <Badge variant="accent">REST</Badge>
        <Badge variant="accent">MCP</Badge>
        <span className="ml-auto font-mono text-[11px] text-muted">per call</span>
      </div>
    </Card>
  );
}
