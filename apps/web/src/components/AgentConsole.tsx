import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "./Reveal";
import {
  ALLWEATHER,
  REGIMES,
  tiltedTargets,
  hex,
  fakeDeployHash,
  explorer,
  type Asset,
  type Regime,
} from "../lib/data";

type Phase = "perceive" | "regime" | "decide" | "act" | "report";
type LogEntry = { id: number; phase: Phase; text: string; hash?: string };

const PHASE_META: Record<Phase, { label: string; color: string }> = {
  perceive: { label: "PERCEIVE", color: "#38bdf8" },
  regime: { label: "REGIME", color: "#fbbf24" },
  decide: { label: "DECIDE", color: "#a78bfa" },
  act: { label: "ACT", color: "#34d399" },
  report: { label: "REPORT", color: "#f4f4f5" },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BAND = 4;

type Macro = { growth: "rising" | "falling"; inflation: "rising" | "falling"; gdp: number; cpi: number };

function detectRegime(m: Macro): Regime {
  return REGIMES.find((r) => r.growth === m.growth && r.inflation === m.inflation)!;
}

// initial drifted book around base weights
function driftedBook(): Record<string, number> {
  const b: Record<string, number> = {};
  ALLWEATHER.forEach((a, i) => {
    const noise = [9, -6, -4, 5, -4][i] ?? 0;
    b[a.ticker] = Math.max(0, +(a.weight + noise).toFixed(1));
  });
  return b;
}

const INITIAL_MACRO: Macro = { growth: "rising", inflation: "rising", gdp: 2.4, cpi: 3.6 };

export default function AgentConsole() {
  const [book, setBook] = useState<Record<string, number>>(driftedBook);
  const [macro, setMacro] = useState<Macro>(INITIAL_MACRO);
  const [regime, setRegime] = useState<Regime | null>(null);
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const t: Record<string, number> = {};
    ALLWEATHER.forEach((a) => (t[a.ticker] = a.weight));
    return t;
  });
  const [rep, setRep] = useState(72);
  const [repDelta, setRepDelta] = useState<number | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const idRef = useRef(0);

  const push = (e: Omit<LogEntry, "id">) =>
    setLog((l) => [...l, { ...e, id: idRef.current++ }]);

  const maxDrift = Math.max(
    ...ALLWEATHER.map((a) => Math.abs((book[a.ticker] ?? 0) - (targets[a.ticker] ?? a.weight)))
  );

  async function runCycle() {
    if (running) return;
    setRunning(true);
    setLog([]);
    setRepDelta(null);
    await sleep(180);

    // 1. PERCEIVE — pay for macro + price feed via x402
    push({ phase: "perceive", text: "Requesting macro + price feed via x402…" });
    await sleep(850);
    push({
      phase: "perceive",
      text: `Paid 0.01 USDC · GDP ${macro.gdp > 0 ? "+" : ""}${macro.gdp}% · CPI ${macro.cpi}%`,
      hash: fakeDeployHash(),
    });
    await sleep(700);

    // 2. REGIME — classify + tilt (the agent's judgment)
    const r = detectRegime(macro);
    setRegime(r);
    push({
      phase: "regime",
      text: `Growth ${macro.growth}, inflation ${macro.inflation} → ${r.name}. ${r.blurb}`,
    });
    await sleep(950);
    const newTargets = tiltedTargets(r);
    setTargets(newTargets);
    push({ phase: "regime", text: `Tilting All-Weather targets for ${r.name} regime.` });
    await sleep(850);

    // 3. DECIDE — drift vs tilted targets
    const off = ALLWEATHER.filter(
      (a) => Math.abs((book[a.ticker] ?? 0) - newTargets[a.ticker]) >= BAND
    );
    push({
      phase: "decide",
      text: `Drift vs new targets: ${off.length} assets beyond ${BAND}pp band`,
    });
    await sleep(800);

    if (off.length === 0) {
      push({ phase: "report", text: "Already aligned to regime targets. No trades." });
      finishRep(r);
      return;
    }

    // 4. ACT — swap via CSPR.trade
    for (const a of off) {
      const dir = (book[a.ticker] ?? 0) > newTargets[a.ticker] ? "Sell" : "Buy";
      push({
        phase: "act",
        text: `${dir} ${a.ticker} → ${newTargets[a.ticker]}% · CSPR.trade AMM`,
        hash: fakeDeployHash(),
      });
      setBook((b) => ({ ...b, [a.ticker]: newTargets[a.ticker] }));
      await sleep(780);
    }

    // 5. REPORT — stake reputation on the call
    await sleep(300);
    push({ phase: "report", text: `Rebalanced to ${r.name} allocation.` });
    finishRep(r);
  }

  function finishRep(r: Regime) {
    // simulate whether the regime call paid off; agent is good, mostly positive
    const roll = Math.random();
    const delta = roll < 0.18 ? -2 : roll < 0.4 ? 1 : roll < 0.8 ? 3 : 5;
    setRep((v) => Math.min(100, Math.max(0, v + delta)));
    setRepDelta(delta);
    push({
      phase: "report",
      text: `Staked reputation on ${r.name} call → ${delta >= 0 ? "+" : ""}${delta}. Recorded on Passport.`,
      hash: fakeDeployHash(),
    });
    setCycles((c) => c + 1);
    setRunning(false);
  }

  function shakeMarket() {
    if (running) return;
    const growth = Math.random() > 0.5 ? "rising" : "falling";
    const inflation = Math.random() > 0.5 ? "rising" : "falling";
    setMacro({
      growth,
      inflation,
      gdp: +(growth === "rising" ? Math.random() * 3 + 0.5 : -(Math.random() * 2)).toFixed(1),
      cpi: +(inflation === "rising" ? Math.random() * 3 + 3 : Math.random() * 2 + 0.5).toFixed(1),
    });
    const b: Record<string, number> = {};
    ALLWEATHER.forEach((a) => {
      const noise = (Math.random() - 0.5) * 16;
      b[a.ticker] = Math.max(0, +(a.weight + noise).toFixed(1));
    });
    setBook(b);
    setLog([]);
    setRepDelta(null);
  }

  return (
    <section id="agent" className="relative z-10 mx-auto w-[min(92%,72rem)] py-24 md:py-36">
      <Reveal>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300/90">
          The agent · live on Casper Testnet
        </span>
        <h2 className="mt-6 max-w-2xl font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-tight tracking-tight">
          It reads the economy. Then it acts — and stakes its name on it.
        </h2>
        <p className="mt-5 max-w-xl text-white/55">
          Most "portfolio bots" hold fixed weights. Bastion classifies the macro
          <em className="not-italic text-amber-200"> regime</em>, tilts the All-Weather
          allocation toward what wins in that regime, rebalances on-chain via CSPR.trade,
          and <em className="not-italic text-emerald-300">stakes its on-chain reputation</em>
          on every call. Run it:
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* LEFT */}
        <Reveal className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner h-full bg-black/40 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            {/* regime + reputation strip */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Detected regime</div>
                <div className="mt-2 font-display text-lg font-semibold" style={{ color: regime ? "#fbbf24" : "#ffffff66" }}>
                  {regime ? regime.name : "— run agent —"}
                </div>
                <div className="mt-1 font-mono text-[11px] text-white/40">
                  {regime ? `${regime.growth} growth · ${regime.inflation} inflation` : "awaiting macro read"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Agent reputation</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-medium text-white">{rep}</span>
                  <AnimatePresence>
                    {repDelta !== null && (
                      <motion.span
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-mono text-xs"
                        style={{ color: repDelta >= 0 ? "#34d399" : "#fb7185" }}
                      >
                        {repDelta >= 0 ? "+" : ""}{repDelta}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div className="h-full rounded-full bg-emerald-400" animate={{ width: `${rep}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">Holdings vs regime target</span>
              <span className="font-mono text-xs" style={{ color: maxDrift >= BAND ? "#fb7185" : "#34d399" }}>
                {maxDrift >= BAND ? `drift ${maxDrift.toFixed(1)}pp` : "on target"}
              </span>
            </div>

            <div className="space-y-4">
              {ALLWEATHER.map((a) => (
                <WeightRow key={a.ticker} asset={a} actual={book[a.ticker] ?? 0} target={targets[a.ticker] ?? a.weight} />
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={runCycle}
                disabled={running}
                className="group flex items-center gap-2 rounded-full bg-emerald-400 py-3 pl-5 pr-2.5 text-sm font-medium text-black transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:opacity-50"
              >
                {running ? "Agent running…" : "Run agent"}
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black/15 transition-transform duration-500 group-hover:translate-x-0.5">▶</span>
              </button>
              <button
                onClick={shakeMarket}
                disabled={running}
                className="rounded-full border border-white/15 px-5 py-3 text-sm text-white/75 transition-colors duration-300 hover:bg-white/5 disabled:opacity-40"
              >
                Simulate market shift
              </button>
            </div>
            <div className="mt-4 font-mono text-xs text-white/35">cycles: {cycles} · network: casper-test</div>
          </div>
        </Reveal>

        {/* RIGHT — log */}
        <Reveal delay={0.12} className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner flex h-full min-h-[28rem] flex-col bg-[#070809] p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-3 font-mono text-xs text-white/40">agent.log</span>
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto font-mono text-[13px] leading-relaxed">
              {log.length === 0 && <div className="text-white/30">// idle — press "Run agent"…</div>}
              <AnimatePresence initial={false}>
                {log.map((e) => (
                  <motion.div key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ color: PHASE_META[e.phase].color, backgroundColor: PHASE_META[e.phase].color + "1a" }}>
                      {PHASE_META[e.phase].label}
                    </span>
                    <span className="text-white/75">{e.text}</span>
                    {e.hash && (
                      <a href={explorer(e.hash)} target="_blank" rel="noreferrer" className="text-emerald-300/80 underline decoration-emerald-300/30 underline-offset-2 transition-colors hover:text-emerald-300">
                        {e.hash.slice(0, 10)}↗
                      </a>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-5 border-t border-white/5 pt-4 text-xs text-white/35">
              Every decision + reputation update is written on-chain. Funds stay in your
              custody — the agent rebalances, never withdraws.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function WeightRow({ asset, actual, target }: { asset: Asset; actual: number; target: number }) {
  const off = Math.abs(actual - target) >= BAND;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-sm text-white">{asset.ticker}</span>
        <span className="font-mono text-xs text-white/45">
          <span style={{ color: off ? "#fb7185" : hex(asset.accent) }}>{actual.toFixed(1)}%</span>
          <span className="text-white/25"> / {target.toFixed(1)}%</span>
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="absolute top-0 z-10 h-full w-px bg-white/50" style={{ left: `${Math.min(100, target * 2)}%` }} />
        <motion.div className="h-full rounded-full" style={{ backgroundColor: hex(asset.accent) }} animate={{ width: `${Math.min(100, actual * 2)}%` }} transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }} />
      </div>
    </div>
  );
}
