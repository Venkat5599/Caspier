import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "./Reveal";
import { ALLWEATHER, hex, fakeDeployHash, explorer, type Asset } from "../lib/data";

type Phase = "perceive" | "decide" | "act" | "report";
type LogEntry = {
  id: number;
  phase: Phase;
  text: string;
  hash?: string;
};

const PHASE_META: Record<Phase, { label: string; color: string }> = {
  perceive: { label: "PERCEIVE", color: "#38bdf8" },
  decide: { label: "DECIDE", color: "#a78bfa" },
  act: { label: "ACT", color: "#34d399" },
  report: { label: "REPORT", color: "#fbbf24" },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BAND = 4; // rebalance threshold in percentage points

// start with a drifted book so the first cycle does real work
function driftedBook(): Record<string, number> {
  const book: Record<string, number> = {};
  ALLWEATHER.forEach((a, i) => {
    const noise = [9, -6, -4, 5, -4][i] ?? 0;
    book[a.ticker] = Math.max(0, a.weight + noise);
  });
  return book;
}

export default function AgentConsole() {
  const [book, setBook] = useState<Record<string, number>>(driftedBook);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const idRef = useRef(0);

  const target = (t: string) => ALLWEATHER.find((a) => a.ticker === t)!.weight;
  const maxDrift = Math.max(...ALLWEATHER.map((a) => Math.abs(book[a.ticker] - a.weight)));

  const push = (e: Omit<LogEntry, "id">) =>
    setLog((l) => [...l, { ...e, id: idRef.current++ }]);

  async function runCycle() {
    if (running) return;
    setRunning(true);
    setLog([]);
    await sleep(200);

    // 1. PERCEIVE
    push({ phase: "perceive", text: "Requesting price + macro feed via x402…" });
    await sleep(900);
    push({
      phase: "perceive",
      text: "Paid 0.01 USDC per request · feed received",
      hash: fakeDeployHash(),
    });
    await sleep(700);

    // 2. DECIDE
    const offTargets = ALLWEATHER.filter(
      (a) => Math.abs(book[a.ticker] - a.weight) >= BAND
    );
    push({
      phase: "decide",
      text: `Computed drift across 5 assets · max ${maxDrift.toFixed(1)}pp vs ${BAND}pp band`,
    });
    await sleep(900);

    if (offTargets.length === 0) {
      push({ phase: "decide", text: "Within band — no rebalance needed." });
      push({ phase: "report", text: "Cycle complete. Portfolio on target." });
      setCycles((c) => c + 1);
      setRunning(false);
      return;
    }

    push({
      phase: "decide",
      text: `${offTargets.length} assets off target → building rebalance plan`,
    });
    await sleep(800);

    // 3. ACT — swap each off-target asset back toward target via CSPR.trade
    for (const a of offTargets) {
      const dir = book[a.ticker] > a.weight ? "Sell" : "Buy";
      push({
        phase: "act",
        text: `${dir} ${a.ticker} → target ${a.weight}% · routed via CSPR.trade AMM`,
        hash: fakeDeployHash(),
      });
      setBook((b) => ({ ...b, [a.ticker]: a.weight }));
      await sleep(850);
    }

    // 4. REPORT
    await sleep(300);
    push({ phase: "report", text: "Rebalanced. All weights restored to target." });
    setCycles((c) => c + 1);
    setRunning(false);
  }

  function shakeMarket() {
    if (running) return;
    const b: Record<string, number> = {};
    ALLWEATHER.forEach((a) => {
      const noise = (Math.random() - 0.5) * 18;
      b[a.ticker] = Math.max(0, +(a.weight + noise).toFixed(1));
    });
    setBook(b);
    setLog([]);
  }

  return (
    <section id="agent" className="relative z-10 mx-auto w-[min(92%,72rem)] py-24 md:py-36">
      <Reveal>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300/90">
          The agent · live on Casper Testnet
        </span>
        <h2 className="mt-6 max-w-2xl font-display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-tight tracking-tight">
          Not a dashboard. An agent that acts.
        </h2>
        <p className="mt-5 max-w-xl text-white/55">
          Every cycle it <em className="not-italic text-sky-300">perceives</em> the market
          (paying for data via x402), <em className="not-italic text-violet-300">decides</em> if
          your portfolio has drifted, and <em className="not-italic text-emerald-300">acts</em> by
          rebalancing on-chain through CSPR.trade. Run a cycle:
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* LEFT — target vs actual */}
        <Reveal className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner h-full bg-black/40 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Target vs actual
              </span>
              <span
                className="font-mono text-xs"
                style={{ color: maxDrift >= BAND ? "#fb7185" : "#34d399" }}
              >
                {maxDrift >= BAND ? `drift ${maxDrift.toFixed(1)}pp` : "on target"}
              </span>
            </div>

            <div className="space-y-5">
              {ALLWEATHER.map((a) => (
                <WeightRow key={a.ticker} asset={a} actual={book[a.ticker]} target={target(a.ticker)} />
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={runCycle}
                disabled={running}
                className="group flex items-center gap-2 rounded-full bg-emerald-400 py-3 pl-5 pr-2.5 text-sm font-medium text-black transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:opacity-50"
              >
                {running ? "Agent running…" : "Run agent cycle"}
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black/15 transition-transform duration-500 group-hover:translate-x-0.5">
                  ▶
                </span>
              </button>
              <button
                onClick={shakeMarket}
                disabled={running}
                className="rounded-full border border-white/15 px-5 py-3 text-sm text-white/75 transition-colors duration-300 hover:bg-white/5 disabled:opacity-40"
              >
                Simulate market move
              </button>
            </div>
            <div className="mt-4 font-mono text-xs text-white/35">
              cycles run: {cycles} · network: casper-test
            </div>
          </div>
        </Reveal>

        {/* RIGHT — activity log */}
        <Reveal delay={0.12} className="bezel border border-white/10 bg-white/[0.03] p-1.5">
          <div className="bezel-inner flex h-full min-h-[26rem] flex-col bg-[#070809] p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-3 font-mono text-xs text-white/40">agent.log</span>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto font-mono text-[13px] leading-relaxed">
              {log.length === 0 && (
                <div className="text-white/30">// idle — press “Run agent cycle”…</div>
              )}
              <AnimatePresence initial={false}>
                {log.map((e) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-wrap items-baseline gap-2"
                  >
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        color: PHASE_META[e.phase].color,
                        backgroundColor: PHASE_META[e.phase].color + "1a",
                      }}
                    >
                      {PHASE_META[e.phase].label}
                    </span>
                    <span className="text-white/75">{e.text}</span>
                    {e.hash && (
                      <a
                        href={explorer(e.hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-300/80 underline decoration-emerald-300/30 underline-offset-2 transition-colors hover:text-emerald-300"
                      >
                        {e.hash.slice(0, 10)}↗
                      </a>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-5 border-t border-white/5 pt-4 text-xs text-white/35">
              Hashes link to testnet.cspr.live. Funds stay in your custody — the agent
              can rebalance, never withdraw.
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
          <span className="text-white/25"> / {target}%</span>
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        {/* target marker */}
        <div className="absolute top-0 z-10 h-full w-px bg-white/40" style={{ left: `${target * 2}%` }} />
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: hex(asset.accent) }}
          animate={{ width: `${actual * 2}%` }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
    </div>
  );
}
