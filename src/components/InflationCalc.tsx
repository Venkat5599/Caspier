import { useState } from "react";
import Reveal from "./Reveal";

const REGIONS = [
  { name: "Global", rate: 0.062 },
  { name: "North America", rate: 0.048 },
  { name: "Europe", rate: 0.055 },
  { name: "South America", rate: 0.094 },
  { name: "Africa", rate: 0.112 },
];

const YEARS = 5;
const AW_REAL = 0.012; // ~1.2% real annual after inflation, defensive

export default function InflationCalc() {
  const [amount, setAmount] = useState(10000);
  const [region, setRegion] = useState(REGIONS[0]);

  const cash = amount * Math.pow(1 - region.rate, YEARS);
  const awNominal = amount * Math.pow(1 + AW_REAL + region.rate, YEARS); // illustrative agent-managed nominal path
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

  return (
    <section id="calculator" className="relative z-10 mx-auto w-[min(92%,72rem)] py-24 md:py-36">
      <Reveal>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-amber-200/90">
          The cost of doing nothing
        </span>
        <h2 className="mt-6 max-w-2xl font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-tight tracking-tight">
          What inflation does to idle savings.
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* controls */}
        <Reveal className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner space-y-7 bg-black/40 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/40">
                Savings amount
              </label>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                <span className="font-mono text-white/40">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, +e.target.value))}
                  className="w-full bg-transparent font-mono text-lg text-white outline-none"
                />
              </div>
              <input
                type="range"
                min={1000}
                max={100000}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(+e.target.value)}
                className="mt-4 w-full accent-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/40">Region</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => setRegion(r)}
                    className={`rounded-full px-3.5 py-1.5 text-xs transition-all duration-300 ${
                      region.name === r.name
                        ? "bg-white text-black"
                        : "border border-white/15 text-white/65 hover:bg-white/5"
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
              <div className="mt-3 font-mono text-xs text-white/40">
                inflation: {(region.rate * 100).toFixed(1)}% / yr · horizon: {YEARS} yrs
              </div>
            </div>
          </div>
        </Reveal>

        {/* result */}
        <Reveal delay={0.12} className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner grid h-full grid-cols-1 gap-4 bg-gradient-to-br from-amber-500/[0.05] via-black/40 to-emerald-500/[0.06] p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] sm:grid-cols-2">
            <ResultCard
              tone="loss"
              label="Cash under the mattress"
              value={fmt(cash)}
              delta={`−${fmt(amount - cash)}`}
              note="purchasing power lost"
            />
            <ResultCard
              tone="gain"
              label="Bastion All-Weather"
              value={fmt(awNominal)}
              delta={`+${fmt(awNominal - amount)}`}
              note="nominal, agent-managed"
            />
            <div className="sm:col-span-2 rounded-xl border border-white/5 bg-black/30 px-5 py-4 text-sm text-white/55">
              Same {fmt(amount)} over {YEARS} years. Doing nothing isn't safe — it's a
              guaranteed, silent loss. The agent keeps the money working.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ResultCard({
  tone,
  label,
  value,
  delta,
  note,
}: {
  tone: "loss" | "gain";
  label: string;
  value: string;
  delta: string;
  note: string;
}) {
  const c = tone === "gain" ? "#34d399" : "#fb7185";
  return (
    <div className="rounded-2xl border border-white/8 bg-black/40 p-5">
      <div className="text-xs text-white/45">{label}</div>
      <div className="mt-3 font-mono text-3xl font-medium text-white">{value}</div>
      <div className="mt-2 font-mono text-sm" style={{ color: c }}>
        {delta}
      </div>
      <div className="mt-1 text-xs text-white/35">{note}</div>
    </div>
  );
}
