import Reveal from "./Reveal";
import { ALLWEATHER, hex } from "../lib/data";

export default function Allocation() {
  return (
    <section id="strategy" className="relative z-10 mx-auto w-[min(92%,72rem)] py-24 md:py-36">
      <Reveal>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/50">
          The strategy
        </span>
        <h2 className="mt-6 max-w-2xl font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-tight tracking-tight">
          One portfolio engineered for every economic season.
        </h2>
        <p className="mt-5 max-w-xl text-white/55">
          The All-Weather allocation balances five asset classes so the portfolio holds
          up whether growth rises or falls, inflation spikes or fades. It's the base —
          Bastion then tilts it toward the four economic regimes, holding each asset as a
          tokenized real-world asset on Casper.
        </p>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* allocation bars */}
        <Reveal delay={0.1} className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner space-y-5 bg-black/40 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            {ALLWEATHER.map((a) => (
              <div key={a.ticker}>
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white">{a.ticker}</span>
                    <span className="text-sm text-white/45">{a.name}</span>
                  </div>
                  <span className="font-mono text-sm" style={{ color: hex(a.accent) }}>
                    {a.weight}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    style={{ width: `${a.weight * 2}%`, backgroundColor: hex(a.accent) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* crisis proof */}
        <Reveal delay={0.2} className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner flex h-full flex-col justify-between gap-6 bg-gradient-to-b from-emerald-500/[0.06] to-black/40 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                Held up when it mattered
              </div>
              <div className="mt-5 space-y-5">
                <CrisisRow year="2008" aw="−18%" spx="−56%" />
                <CrisisRow year="2020" aw="−7%" spx="−34%" />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/50">
              Drawdowns vs the S&P 500 in the two worst modern crises. Defense is the
              whole point — the agent keeps you in this allocation automatically.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CrisisRow({ year, aw, spx }: { year: string; aw: string; spx: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-4 py-3">
      <span className="font-mono text-sm text-white/70">{year}</span>
      <div className="flex items-center gap-5">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-white/35">All-Weather</div>
          <div className="font-mono text-sm text-emerald-300">{aw}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-white/35">S&P 500</div>
          <div className="font-mono text-sm text-rose-400">{spx}</div>
        </div>
      </div>
    </div>
  );
}
