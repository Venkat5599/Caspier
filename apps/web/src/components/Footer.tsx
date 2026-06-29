import { gatewayUrl } from "../lib/api";

export default function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-zinc-500 md:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-glow/15 text-[11px] font-bold text-emerald-glow">
            ◆
          </span>
          <span className="font-display font-semibold text-zinc-300">Agent Fabric</span>
          <span className="text-zinc-600">· permissioned execution layer</span>
        </div>
        <div className="flex items-center gap-5 font-mono text-xs">
          <a
            href="https://github.com/Venkat5599/Caspier"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-zinc-300"
          >
            GitHub
          </a>
          <a
            href={`${gatewayUrl}/health`}
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-emerald-glow"
          >
            status
          </a>
        </div>
      </div>
    </footer>
  );
}
