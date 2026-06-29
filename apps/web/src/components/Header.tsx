import { gatewayUrl } from "../lib/api";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-void/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-glow/15 text-emerald-glow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Agent Fabric</span>
        </a>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <a href="#skills" className="transition hover:text-zinc-100">Skills</a>
          <a href="#publish" className="transition hover:text-zinc-100">Publish</a>
          <a
            href={`${gatewayUrl}/skills`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-zinc-500 transition hover:text-emerald-glow"
          >
            API ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
