import Reveal from "./Reveal";

export default function Footer() {
  return (
    <footer className="relative z-10 mx-auto w-[min(92%,72rem)] pb-16">
      <Reveal className="bezel overflow-hidden border border-white/10 bg-white/[0.03] p-1.5">
        <div className="bezel-inner relative bg-gradient-to-br from-emerald-500/[0.1] via-black/50 to-amber-500/[0.08] p-10 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] md:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-[clamp(2rem,4.5vw,3.6rem)] font-semibold leading-tight tracking-tight">
            Let the agent take the night shift.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-white/55">
            Connect a wallet, set your risk, and let Bastion run your All-Weather
            portfolio on Casper — autonomously, in your custody.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#agent"
              className="group flex items-center gap-2 rounded-full bg-white py-3.5 pl-6 pr-2.5 text-sm font-medium text-black transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              Launch the agent
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-px">
                ↗
              </span>
            </a>
            <a
              href="#top"
              className="rounded-full border border-white/15 px-6 py-3.5 text-sm font-medium text-white/80 transition-colors duration-300 hover:bg-white/5"
            >
              Back to top
            </a>
          </div>
        </div>
      </Reveal>

      <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-sm text-white/40 md:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-emerald-400/90 to-amber-300/80 text-[11px] font-bold text-black">
            ◆
          </span>
          <span className="font-display font-semibold text-white/70">Bastion</span>
          <span className="text-white/30">· Casper Agentic Buildathon 2026</span>
        </div>
        <p className="max-w-md text-center text-xs text-white/30 md:text-right">
          Testnet demo. wRWA tokens are test assets, not real securities. Backtest /
          performance figures are illustrative. Not financial advice.
        </p>
      </div>
    </footer>
  );
}
