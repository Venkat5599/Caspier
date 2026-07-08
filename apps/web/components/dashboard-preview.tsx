import { KairosMark } from "@/components/kairos-logo";
import { siteConfig } from "@/lib/config";
import { KeyRound, Plus, Search, Server, Store, Workflow, Zap } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { label: "Catalog", icon: Store, active: true },
  { label: "Publish", icon: Plus, active: false },
  { label: "Workflows", icon: Workflow, active: false },
  { label: "MCP", icon: Server, active: false },
  { label: "Session keys", icon: KeyRound, active: false },
] as const;

const SKILLS = [
  {
    name: "hello-weather",
    slug: "hello-weather@0.1",
    description: "Weather lookup via allowlisted egress — x402 metered.",
    price: "1000 ETH",
  },
  {
    name: "echo-skill",
    slug: "echo-skill@0.1",
    description: "Echo handler for REST and MCP invoke tests.",
    price: "Free",
  },
] as const;

export function DashboardPreview(): ReactNode {
  return (
    <div
      className="flex aspect-[16/10] min-h-[280px] w-full overflow-hidden bg-frame text-foreground"
      aria-label={`${siteConfig.name} dashboard preview`}
    >
      <aside className="hidden w-[30%] max-w-52 shrink-0 flex-col border-r border-border bg-frame sm:flex">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-black">
              <KairosMark className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold leading-tight">{siteConfig.name}</p>
              <p className="text-[9px] text-muted-foreground">Sepolia testnet</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium ${
                active
                  ? "bg-accent/15 text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {label}
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-tight sm:text-base">Skill catalog</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
              Pay-per-call endpoints — REST + MCP
            </p>
          </div>
          <div className="flex gap-1.5">
            <span className="rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground">
              x402
            </span>
            <span className="rounded-lg bg-foreground px-2.5 py-1 text-[10px] font-medium text-background">
              Publish
            </span>
          </div>
        </div>

        <div className="relative mt-3 max-w-xs">
          <Search
            className="absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="rounded-lg border border-border bg-background py-1.5 pr-2 pl-8 text-[10px] text-muted-foreground">
            Search skills…
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SKILLS.map((skill) => (
            <div
              key={skill.slug}
              className="rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15">
                  <Zap className="h-4 w-4 text-foreground" aria-hidden="true" />
                </span>
                <span className="rounded-md bg-accent/20 px-1.5 py-0.5 text-[9px] font-medium">
                  {skill.price}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold">{skill.name}</p>
              <p className="font-mono text-[9px] text-muted-foreground">{skill.slug}</p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                {skill.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
            POST /s/hello-weather
          </span>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-medium text-foreground">
            MCP invoke_skill
          </span>
        </div>
      </main>
    </div>
  );
}
