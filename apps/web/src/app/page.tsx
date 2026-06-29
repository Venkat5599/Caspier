import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Coins,
  Server,
  KeyRound,
  FileCode2,
  Gauge,
  Boxes,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/* ---------- product mockups (styled, no external images) ---------- */

function EndpointMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/5">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-2 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400/70" />
        <span className="h-3 w-3 rounded-full bg-amber-400/70" />
        <span className="h-3 w-3 rounded-full bg-green-400/70" />
        <span className="ml-3 font-mono text-xs text-muted">POST /s/hello-weather</span>
      </div>
      <div className="space-y-3 p-5 font-mono text-xs leading-relaxed">
        <p className="text-muted">$ curl -X POST /s/hello-weather -d &apos;{`{"city":"Tokyo"}`}&apos;</p>
        <p className="text-amber-500">← 402 Payment Required · 1000 USDC</p>
        <p className="text-muted">$ retry with x402 proof</p>
        <p className="text-accent">→ 200 OK</p>
        <pre className="rounded-lg bg-bg p-3 text-foreground">{`{ "summary": "Tokyo is 22°C, clear." }`}</pre>
      </div>
    </div>
  );
}

function CatalogMock() {
  const rows = [
    { n: "hello-weather", p: "1000 USDC" },
    { n: "summarize-pdf", p: "500 USDC" },
    { n: "price-feed", p: "free" },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/5">
      <div className="border-b border-border bg-surface-2 px-5 py-3 text-sm font-semibold">
        Catalog
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.n} className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                <Boxes className="h-4 w-4" />
              </span>
              <span className="font-mono text-sm">{r.n}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">REST·MCP</span>
              <span className="font-mono text-xs text-accent">{r.p}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyScopeMock() {
  const scopes = ["spend ≤ 5 CSPR / call", "allow: cspr.trade, x402", "deny: key management", "revoke: 1 tx"];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/5">
      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-5 py-3">
        <KeyRound className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold">Session key — scoped</span>
      </div>
      <div className="space-y-2.5 p-5">
        {scopes.map((s) => (
          <div key={s} className="flex items-center gap-2.5 font-mono text-xs">
            <span className="grid h-5 w-5 place-items-center rounded bg-green-500/10 text-green-500">
              <Check className="h-3 w-3" />
            </span>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- data ---------- */

const PILLARS = [
  { icon: Shield, title: "Scoped by default", body: "Agents act through a Casper session key — bounded by method, asset, value, and host. The primary key is never exposed." },
  { icon: Coins, title: "Economic primitives", body: "Any skill or workflow becomes an x402-compatible, usage-based endpoint that agents can safely pay for, per call." },
  { icon: Server, title: "MCP-compatible", body: "Every skill is discoverable as a Model Context Protocol tool — usable by Claude, ChatGPT, and any MCP client." },
];

const FEATURES = [
  {
    eyebrow: "Publish",
    title: "Turn a SKILL.md into a live endpoint",
    body: "Upload one Markdown file. Agent Fabric validates it, sandboxes the body, and serves it as a REST route and an MCP tool — instantly.",
    mock: <EndpointMock />,
    flip: false,
  },
  {
    eyebrow: "Discover",
    title: "A catalog agents can browse and call",
    body: "Published skills land in a searchable catalog with pricing, schemas, and live status. Humans browse it; agents query it over MCP.",
    mock: <CatalogMock />,
    flip: true,
  },
  {
    eyebrow: "Bound",
    title: "Autonomy without custody, on Casper",
    body: "Agents spend through a low-weight session key that can pay but never escalate or drain — capped, rate-limited, and revocable in one transaction.",
    mock: <KeyScopeMock />,
    flip: false,
  },
];

const STATS = [
  { value: "0", label: "private keys exposed" },
  { value: "1-tx", label: "instant revoke" },
  { value: "REST + MCP", label: "two front doors per skill" },
  { value: "per-call", label: "x402 metered settlement" },
];

const STACK = ["Casper", "x402", "Model Context Protocol", "Postgres", "gVisor", "Bun", "TypeScript", "Next.js"];

const QUOTES = [
  { q: "Agents that can act, bounded by keys that can't drain. This is the missing safety layer.", who: "Agentic finance" },
  { q: "One Markdown file becomes a metered API and an MCP tool. The integration tax is gone.", who: "Builders" },
  { q: "Spend caps and a one-transaction kill switch — autonomy you can actually deploy near money.", who: "Protocol teams" },
];

const UPDATES = [
  { date: "Shipped", title: "SKILL.md parser + validator", tag: "core" },
  { date: "Shipped", title: "Publish → discover loop over REST", tag: "gateway" },
  { date: "Shipped", title: "Catalog exposed as MCP tools", tag: "mcp" },
  { date: "Shipped", title: "Durable Postgres catalog + CI/CD", tag: "infra" },
];

/* ---------- page ---------- */

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="ambient" />
        <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg/70 px-4 py-1.5 font-mono text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Permissioned execution layer · Casper · x402-native
          </div>
          <h1 className="mt-7 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Agent skills,
            <br />
            served as endpoints.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Turn a SKILL.md into a live REST and MCP endpoint — validated, sandboxed, and metered.
            Humans, apps, and agents call it and pay per call.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/apis/create">
              <Button size="lg">
                Create an API <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/apis">
              <Button size="lg" variant="outline">
                Explore APIs
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative mx-auto max-w-3xl px-6 pb-20">
          <EndpointMock />
        </div>
      </section>

      {/* Pillars */}
      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              One platform for agent skills and payments
            </h2>
            <p className="mt-4 text-muted">
              Publish, meter, and serve capabilities that AI agents can safely consume — without
              handing over a private key.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {PILLARS.map((p) => (
              <Card key={p.title} className="p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                  <p.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Alternating feature rows */}
      {FEATURES.map((f) => (
        <section key={f.title} className="border-b border-border py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
            <div className={f.flip ? "lg:order-2" : ""}>
              <p className="font-mono text-xs uppercase tracking-widest text-accent">{f.eyebrow}</p>
              <h3 className="mt-3 text-3xl font-extrabold tracking-tight">{f.title}</h3>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">{f.body}</p>
            </div>
            <div className={f.flip ? "lg:order-1" : ""}>{f.mock}</div>
          </div>
        </section>
      ))}

      {/* Built with marquee */}
      <section className="overflow-hidden border-b border-border py-12">
        <p className="mb-6 text-center font-mono text-xs uppercase tracking-widest text-muted">Built with</p>
        <div className="flex">
          <div className="marquee-track flex shrink-0 items-center gap-12 pr-12">
            {[...STACK, ...STACK].map((t, i) => (
              <span key={i} className="whitespace-nowrap text-lg font-semibold text-muted">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-surface py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-extrabold tracking-tight text-accent">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dark band */}
      <section className="bg-ink py-24 text-bg">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Autonomy without custody.
          </h2>
          <p className="mx-auto mt-4 max-w-xl opacity-80">
            Give agents bounded, revocable authority to act and pay — and keep the keys that matter.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/apis/create">
              <Button size="lg" variant="accent">
                Create an API <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://github.com/Venkat5599/Caspier">
              <Button size="lg" variant="outline" className="border-white/20 bg-transparent text-bg hover:bg-white/10">
                View on GitHub
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            Built for the agentic ecosystem
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {QUOTES.map((t) => (
              <Card key={t.who} className="flex flex-col justify-between p-6">
                <p className="text-lg leading-relaxed">&ldquo;{t.q}&rdquo;</p>
                <p className="mt-6 font-mono text-sm text-muted">— {t.who}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recent updates */}
      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-extrabold tracking-tight">Recent updates</h2>
          <div className="mt-8 divide-y divide-border">
            {UPDATES.map((u) => (
              <div key={u.title} className="flex items-center gap-4 py-4">
                <span className="rounded bg-green-500/10 px-2 py-0.5 font-mono text-xs text-green-600 dark:text-green-400">
                  {u.date}
                </span>
                <span className="flex-1 font-medium">{u.title}</span>
                <span className="font-mono text-xs text-muted">{u.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <FileCode2 className="h-7 w-7" />
          </span>
          <h2 className="mt-8 text-4xl font-extrabold leading-tight tracking-tight">
            Ready to ship a skill?
          </h2>
          <p className="mt-4 text-muted">One Markdown file. A live, metered endpoint in minutes.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/apis/create">
              <Button size="lg">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/mcp">
              <Button size="lg" variant="outline">
                <Gauge className="h-4 w-4" /> Connect via MCP
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
