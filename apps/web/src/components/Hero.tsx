export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(52,211,153,0.12), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-glow" />
          permissioned execution layer
        </span>
        <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Agent skills,
          <br />
          <span className="text-emerald-glow">served as endpoints.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          Turn a{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-sm text-zinc-200">
            SKILL.md
          </code>{" "}
          into a live REST and MCP endpoint — validated, sandboxed, and metered. Humans, apps, and
          agents call it and pay per call.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <a
            href="#publish"
            className="rounded-xl bg-emerald-glow px-5 py-2.5 text-sm font-semibold text-void transition hover:bg-emerald-300"
          >
            Publish a skill
          </a>
          <a
            href="#skills"
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-white/20"
          >
            Browse skills
          </a>
        </div>
      </div>
    </section>
  );
}
