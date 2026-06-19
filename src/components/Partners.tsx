import { PARTNERS } from "../lib/data";

export default function Partners() {
  const row = [...PARTNERS, ...PARTNERS];
  return (
    <section className="relative z-10 py-16">
      <div className="mx-auto mb-8 w-[min(92%,72rem)] text-center text-xs uppercase tracking-[0.22em] text-white/35">
        Built on the Casper AI Toolkit
      </div>
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="marquee flex w-max gap-4">
          {row.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-white/65"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
