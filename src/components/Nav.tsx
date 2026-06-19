import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LINKS = [
  { label: "Strategy", href: "#strategy" },
  { label: "Agent", href: "#agent" },
  { label: "Performance", href: "#performance" },
  { label: "Calculator", href: "#calculator" },
];

const EASE = [0.32, 0.72, 0, 1] as const;

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center">
      <nav className="mx-auto mt-6 flex w-[min(92%,64rem)] items-center justify-between rounded-full border border-white/10 bg-black/40 px-3 py-3 pl-6 backdrop-blur-2xl">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-emerald-400/90 to-amber-300/80 text-[13px] font-bold text-black">
            ◆
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Bastion</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-white/60 transition-colors duration-300 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="#agent"
            className="group hidden items-center gap-2 rounded-full bg-white py-2.5 pl-5 pr-2 text-sm font-medium text-black transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:flex"
          >
            Launch Agent
            <span className="grid h-7 w-7 place-items-center rounded-full bg-black/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
              ↗
            </span>
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 md:hidden"
            aria-label="Menu"
          >
            <span
              className={`absolute h-px w-4 bg-white transition-all duration-300 ${open ? "rotate-45" : "-translate-y-1"}`}
            />
            <span
              className={`absolute h-px w-4 bg-white transition-all duration-300 ${open ? "-rotate-45" : "translate-y-1"}`}
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="fixed inset-0 z-[-1] flex flex-col items-center justify-center gap-8 bg-black/80 backdrop-blur-3xl md:hidden"
          >
            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i + 0.1, ease: EASE, duration: 0.6 }}
                className="font-display text-3xl font-medium text-white/80"
              >
                {l.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
