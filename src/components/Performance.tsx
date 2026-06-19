import Reveal from "./Reveal";
import { PERF, CRISES } from "../lib/data";

const W = 720;
const H = 320;
const PAD = { l: 16, r: 16, t: 24, b: 28 };

export default function Performance() {
  const all = [...PERF.allWeather, ...PERF.spx];
  const min = Math.min(...all) * 0.92;
  const max = Math.max(...all) * 1.04;

  const x = (i: number) =>
    PAD.l + (i / (PERF.years.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) =>
    PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);

  const path = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  const area = (arr: number[]) =>
    `${path(arr)} L ${x(arr.length - 1)} ${H - PAD.b} L ${x(0)} ${H - PAD.b} Z`;

  return (
    <section id="performance" className="relative z-10 mx-auto w-[min(92%,72rem)] py-24 md:py-36">
      <Reveal>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/50">
          25-year backtest
        </span>
        <h2 className="mt-6 max-w-2xl font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-tight tracking-tight">
          $100k, two paths, same quarter-century.
        </h2>
      </Reveal>

      <Reveal delay={0.1} className="mt-12 bezel border border-white/10 bg-white/[0.03] p-1.5">
        <div className="bezel-inner bg-black/40 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] md:p-8">
          <div className="mb-6 flex flex-wrap gap-6">
            <Legend color="#34d399" label="All-Weather (Bastion)" val="$352k" />
            <Legend color="#fb7185" label="S&P 500 only" val="$318k" />
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="awFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* crisis bands */}
            {CRISES.map((c) => {
              const i = PERF.years.indexOf(c.year);
              const cx = i >= 0 ? x(i) : x(PERF.years.findIndex((yr) => yr >= c.year));
              return (
                <g key={c.year}>
                  <line x1={cx} y1={PAD.t} x2={cx} y2={H - PAD.b} stroke="#fff" strokeOpacity="0.08" strokeDasharray="3 4" />
                  <text x={cx + 4} y={PAD.t + 12} fill="#ffffff66" fontSize="10" fontFamily="monospace">
                    {c.label}
                  </text>
                  <text x={cx + 4} y={PAD.t + 26} fill="#fb7185" fontSize="10" fontFamily="monospace">
                    SPX {c.spx}
                  </text>
                </g>
              );
            })}

            <path d={area(PERF.allWeather)} fill="url(#awFill)" />
            <path d={path(PERF.spx)} fill="none" stroke="#fb7185" strokeWidth="2" strokeOpacity="0.85" />
            <path d={path(PERF.allWeather)} fill="none" stroke="#34d399" strokeWidth="2.5" />

            {/* year ticks */}
            {PERF.years.map((yr, i) =>
              i % 2 === 0 ? (
                <text key={yr} x={x(i)} y={H - 8} fill="#ffffff44" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  {yr}
                </text>
              ) : null
            )}
          </svg>
          <p className="mt-5 text-sm text-white/45">
            Illustrative backtest. All-Weather trades a little upside for far less pain in
            crashes — the agent's job is to keep you in it without flinching.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function Legend({ color, label, val }: { color: string; label: string; val: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm text-white/70">{label}</span>
      <span className="font-mono text-sm" style={{ color }}>{val}</span>
    </div>
  );
}
