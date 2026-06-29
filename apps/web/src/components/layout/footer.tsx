import Link from "next/link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "APIs", href: "/apis" },
      { label: "Create API", href: "/apis/create" },
      { label: "MCP Servers", href: "/mcp" },
      { label: "Workflows", href: "/workflows" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "GitHub", href: "https://github.com/Venkat5599/Caspier" },
      { label: "Gateway API", href: "http://187.127.137.136:8086/skills" },
      { label: "Status", href: "http://187.127.137.136:8086/health" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Casper", href: "https://casper.network" },
      { label: "x402", href: "#" },
      { label: "Model Context Protocol", href: "https://modelcontextprotocol.io" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight">
              Agent <span className="text-accent">Fabric</span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-muted">
              An agent-native x402 execution fabric on Casper. Skills served as endpoints —
              validated, sandboxed, metered.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Agent Fabric. All code original.</p>
          <p className="font-mono">Built on Casper · x402 · MCP</p>
        </div>
      </div>
    </footer>
  );
}
