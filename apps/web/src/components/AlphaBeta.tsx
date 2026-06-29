import Reveal from "./Reveal";

export default function AlphaBeta() {
  return (
    <section className="relative z-10 mx-auto w-[min(92%,72rem)] py-24 md:py-36">
      <Reveal>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/50">
          Where Bastion fits
        </span>
        <h2 className="mt-6 max-w-2xl font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-tight tracking-tight">
          Defense on autopilot. Offense stays yours.
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Reveal className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner h-full bg-gradient-to-b from-emerald-500/[0.08] to-black/40 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
              BETA · the agent
            </div>
            <h3 className="mt-4 font-display text-2xl font-semibold">Your All-Weather base</h3>
            <p className="mt-3 text-white/55">
              The disciplined core that protects purchasing power across every regime.
              When you check in, Bastion does the work — reads the market, decides, and
              rebalances back to target. Boring on purpose.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner h-full bg-gradient-to-b from-amber-500/[0.08] to-black/40 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-amber-200">
              ALPHA · you
            </div>
            <h3 className="mt-4 font-display text-2xl font-semibold">Your high-conviction bets</h3>
            <p className="mt-3 text-white/55">
              Keep your own plays separate. Bastion never touches them — it secures the
              base so you can take swings without risking the foundation underneath.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
