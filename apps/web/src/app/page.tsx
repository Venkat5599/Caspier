import Link from "next/link";
import {
  ArrowRight,
  Play,
  Bot,
  Layers,
  KeyRound,
  AlertTriangle,
  Unplug,
  ShieldOff,
  Shield,
  Coins,
  Server,
  Settings2,
  PlayCircle,
  Code2,
  Building2,
  Zap,
  Boxes,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-center text-4xl font-extrabold tracking-tight">{children}</h2>;
}

const PROBLEMS = [
  { icon: KeyRound, text: "AI agents either can't act, or require full key access" },
  { icon: AlertTriangle, text: "Hot wallets and unrestricted permissions create unacceptable risk" },
  { icon: Unplug, text: "APIs aren't agent-native or economically programmable" },
  { icon: ShieldOff, text: "On-chain workflows are powerful, but unsafe to automate" },
];

const SOLUTION = [
  {
    icon: Shield,
    title: "Scoped by default",
    body: "Agents operate using session keys with explicitly defined permissions — scoped by method, asset, value, and host. The primary key is never exposed.",
  },
  {
    icon: Coins,
    title: "Economic primitives",
    body: "Turn any API or multi-step workflow into an x402-compatible, usage-based economic primitive agents can safely consume.",
  },
  {
    icon: Server,
    title: "MCP-compatible",
    body: "Publish APIs and workflows as MCP servers, making them discoverable and usable by AI agents like ChatGPT and Claude.",
  },
];

const STEPS = [
  { icon: Layers, title: "Define Capabilities", body: "Create x402 API proxies and on-chain workflows on Casper." },
  { icon: Settings2, title: "Configure Account", body: "Set up a Casper account with scoped, weighted associated keys." },
  { icon: Server, title: "Create an MCP Server", body: "Expose selected APIs and workflows as a permissioned MCP server." },
  { icon: KeyRound, title: "Delegate Safely", body: "Issue a session key that lets an agent perform only approved actions." },
  { icon: PlayCircle, title: "Agent Executes", body: "The agent discovers, reasons, and executes — within strict boundaries." },
];

const AUDIENCE = [
  { icon: Code2, title: "Developers", body: "Build, monetize and expose agent-native APIs and workflows." },
  { icon: Building2, title: "Protocol Teams", body: "Enable safe agent interaction with your contracts and liquidity." },
  { icon: Zap, title: "Power Users", body: "Automate on-chain actions without hot wallets or unlimited permissions." },
];

const PILLS = ["Casper", "x402", "MCP", "Weighted Keys", "Session Keys"];

const STATS = [
  { value: "0", label: "private keys exposed" },
  { value: "1-tx", label: "instant revoke" },
  { value: "REST + MCP", label: "every skill, two front doors" },
  { value: "per-call", label: "x402 metered" },
];

const STACK = [
  "Casper",
  "x402",
  "Model Context Protocol",
  "Postgres",
  "gVisor",
  "Bun",
  "TypeScript",
  "Next.js",
];

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero-glow border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-1.5 font-mono text-xs text-accent">
              Built on Casper · x402-native · MCP-compatible
            </div>
            <h1 className="mt-7 text-6xl font-extrabold leading-[1.02] tracking-tight">
              Agents with limits.
            </h1>
            <p className="mt-5 text-2xl font-semibold text-accent">
              Programmable permissions for AI agents.
            </p>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Agent Fabric is an agent-native x402 execution fabric that lets AI agents safely
              interact with paid APIs and on-chain workflows on Casper — without ever accessing a
              user&apos;s private keys.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#how">
                <Button size="lg">
                  How it Works <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link href="/apis">
                <Button size="lg" variant="outline">
                  <Play className="h-4 w-4" /> Explore APIs
                </Button>
              </Link>
            </div>
          </div>

          {/* Permission-boundary diagram */}
          <div className="relative">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-0">
              <DiagramNode icon={Bot} label="AI Agent" />
              <Connector />
              <div className="w-full rounded-2xl border border-accent/30 bg-surface/40 p-5">
                <span className="rounded-full bg-accent/10 px-3 py-1 font-mono text-xs text-accent">
                  Permission Boundary
                </span>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Boxes className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">Agent Fabric</p>
                    <p className="text-sm text-muted">Scoped execution layer</p>
                  </div>
                </div>
              </div>
              <Connector />
              <div className="flex w-full justify-center gap-10">
                <DiagramNode icon={Server} label="Paid APIs" small />
                <DiagramNode icon={Cpu} label="Casper" small />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto grid max-w-7xl gap-px px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-4 text-center">
              <p className="text-3xl font-extrabold tracking-tight text-accent">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech marquee */}
      <section className="overflow-hidden border-b border-border py-10">
        <p className="mb-6 text-center font-mono text-xs uppercase tracking-widest text-muted">
          Built with
        </p>
        <div className="relative flex">
          <div className="marquee-track flex shrink-0 items-center gap-12 pr-12">
            {[...STACK, ...STACK].map((t, i) => (
              <span key={i} className="whitespace-nowrap text-lg font-semibold text-muted">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle>The problem with AI agents today</SectionTitle>
          <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              {PROBLEMS.map((p) => (
                <Card key={p.text} className="flex items-center gap-4 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-400">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">{p.text}</span>
                </Card>
              ))}
            </div>
            <div className="mx-auto grid h-72 w-64 place-items-center rounded-2xl border border-dashed border-red-500/30 bg-red-500/[0.03]">
              <div className="text-center">
                <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-red-500/10 text-red-400">
                  <KeyRound className="h-10 w-10" />
                </span>
                <p className="mt-5 text-sm font-medium">Full key access</p>
                <p className="font-mono text-xs text-red-400">= Unlimited risk</p>
              </div>
            </div>
          </div>
          <p className="mt-14 text-center text-2xl font-bold tracking-tight">
            Powerful agents without boundaries are a liability.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle>A safe execution layer for agentic finance</SectionTitle>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {SOLUTION.map((s) => (
              <Card key={s.title} className="p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle>How Agent Fabric works</SectionTitle>
          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-accent/30 bg-surface/40 text-accent">
                  <s.icon className="h-6 w-6" />
                  <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-bg">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-16 text-center text-2xl font-bold tracking-tight">
            Autonomous execution, without autonomous risk.
          </p>
        </div>
      </section>

      {/* Why Casper & x402 */}
      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-5xl px-6">
          <SectionTitle>Why Casper &amp; x402</SectionTitle>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <Cpu className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-xl font-bold tracking-tight">Built for Casper</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Agent Fabric runs on Casper and uses its native weighted associated keys + action
                thresholds — enabling agent-driven actions and on-chain automation with a key that
                can spend but never escalate or drain.
              </p>
            </Card>
            <Card className="p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <Coins className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-xl font-bold tracking-tight">x402 by Default</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                x402 turns APIs and workflows into programmable, usage-based economic primitives — a
                perfect fit for autonomous agents and on-chain settlement.
              </p>
            </Card>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {PILLS.map((p) => (
              <span
                key={p}
                className="rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 font-mono text-xs text-accent"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle>Who it&apos;s for</SectionTitle>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {AUDIENCE.map((a) => (
              <Card key={a.title} className="p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                  <a.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-xl font-bold tracking-tight">{a.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{a.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / trust band */}
      <section className="border-b border-border bg-surface/40 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-2xl font-semibold leading-relaxed tracking-tight sm:text-3xl">
            &ldquo;The missing safety layer for agentic finance — agents that can
            <span className="text-accent"> act</span>, bounded by keys that can&apos;t
            <span className="text-accent"> drain</span>.&rdquo;
          </p>
          <p className="mt-6 font-mono text-sm text-muted">
            Built for the Casper agentic ecosystem
          </p>
        </div>
      </section>

      {/* Split CTA */}
      <section className="py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 md:grid-cols-2">
          <Card className="flex flex-col justify-between gap-6 p-8">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Publish a skill</h3>
              <p className="mt-2 text-muted">
                Turn a SKILL.md into a metered REST + MCP endpoint in minutes.
              </p>
            </div>
            <Link href="/apis/create">
              <Button size="lg">
                Create API <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
          <Card className="flex flex-col justify-between gap-6 p-8">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Build with confidence</h3>
              <p className="mt-2 text-muted">
                Open source. Bounded, revocable authority on Casper. No private keys.
              </p>
            </div>
            <a href="https://github.com/Venkat5599/Caspier">
              <Button size="lg" variant="outline">
                Explore the GitHub
              </Button>
            </a>
          </Card>
        </div>
      </section>
    </main>
  );
}

function DiagramNode({
  icon: Icon,
  label,
  small,
}: {
  icon: typeof Bot;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={cnSize(small)}
      >
        <Icon className={small ? "h-5 w-5" : "h-6 w-6"} />
      </span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

function cnSize(small?: boolean) {
  return `grid place-items-center rounded-xl border border-border bg-surface/40 text-foreground ${
    small ? "h-12 w-12" : "h-14 w-14"
  }`;
}

function Connector() {
  return <div className="h-8 w-px bg-border" />;
}
