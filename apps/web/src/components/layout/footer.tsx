export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-12 text-center">
        <p className="text-lg font-bold tracking-tight">
          Agent <span className="text-accent">Fabric</span>
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 font-mono text-xs text-muted">
          <a href="https://github.com/Venkat5599/Caspier" className="hover:text-foreground">
            GitHub
          </a>
          <span>·</span>
          <a href="/mcp" className="hover:text-foreground">
            MCP
          </a>
          <span>·</span>
          <a href="http://187.127.137.136:8086/health" className="hover:text-foreground">
            Status
          </a>
        </div>
        <p className="mx-auto mt-4 max-w-md text-xs text-muted">
          Agent Fabric — an agent-native x402 execution fabric on Casper.
        </p>
      </div>
    </footer>
  );
}
