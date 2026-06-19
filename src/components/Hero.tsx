import { motion } from "framer-motion";
import { STATS } from "../lib/data";

const EASE = [0.32, 0.72, 0, 1] as const;

export default function Hero() {
  return (
    <section id="top" className="relative z-10 mx-auto flex min-h-[100dvh] w-[min(92%,72rem)] flex-col justify-center pt-40 pb-24">
      <motion.span
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mb-6 w-max rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300/90"
      >
        Autonomous · Non-custodial · Built on Casper
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1, ease: EASE, delay: 0.05 }}
        className="font-display text-[clamp(2.6rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-tight"
      >
        Inflation eats your savings.
        <br />
        <span className="bg-gradient-to-r from-emerald-300 via-white to-amber-200 bg-clip-text text-transparent">
          Your agent fights back.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.18 }}
        className="mt-7 max-w-xl text-lg leading-relaxed text-white/55"
      >
        Bastion is an AI agent that builds and rebalances Ray Dalio's All-Weather
        portfolio of tokenized real-world assets. One tap — the agent decides what to
        trade and executes on-chain. Fully in your custody. It even pays for its own data.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
        className="mt-10 flex flex-wrap items-center gap-3"
      >
        <a
          href="#agent"
          className="group flex items-center gap-2 rounded-full bg-white py-3.5 pl-6 pr-2.5 text-sm font-medium text-black transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
        >
          Launch the agent
          <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
            ↗
          </span>
        </a>
        <a
          href="#strategy"
          className="rounded-full border border-white/15 px-6 py-3.5 text-sm font-medium text-white/80 transition-colors duration-300 hover:bg-white/5"
        >
          How it works
        </a>
      </motion.div>

      {/* stat triad */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE, delay: 0.42 }}
        className="mt-20 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {STATS.map((s) => (
          <div key={s.label} className="bezel border border-white/10 bg-white/[0.03] p-1.5">
            <div className="bezel-inner bg-black/40 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="font-mono text-3xl font-medium text-white">{s.value}</div>
              <div className="mt-2 text-sm text-white/70">{s.label}</div>
              <div className="mt-0.5 text-xs text-white/40">{s.sub}</div>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
