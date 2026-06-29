import { useEffect, useState } from "react";
import { listSkills, type SkillSummary } from "../lib/api";

function priceLabel(s: SkillSummary): string {
  return s.pricePerCall === "0" ? "free" : `${s.pricePerCall} ${s.asset}`;
}

function SkillCard({ s }: { s: SkillSummary }) {
  return (
    <div className="group rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-emerald-glow/30 hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-zinc-100">{s.name}</h3>
          <p className="mt-0.5 font-mono text-xs text-zinc-500">
            {s.slug}@{s.version}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-emerald-glow/10 px-2 py-1 font-mono text-xs text-emerald-glow">
          {priceLabel(s)}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-400">{s.description}</p>
      <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-zinc-600">
        <span className="rounded bg-white/5 px-1.5 py-0.5">REST</span>
        <span className="rounded bg-white/5 px-1.5 py-0.5">MCP</span>
        <span className="ml-auto">per call</span>
      </div>
    </div>
  );
}

export default function SkillGrid() {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listSkills()
      .then((s) => alive && setSkills(s))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="skills" className="mx-auto max-w-6xl px-6 py-20">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Live skills</h2>
          <p className="mt-1 text-sm text-zinc-500">Published endpoints, served from the catalog.</p>
        </div>
      </div>

      {error && (
        <p className="mt-8 rounded-xl border border-amber-glow/20 bg-amber-glow/5 px-4 py-3 text-sm text-amber-glow">
          Could not reach the gateway. {error}
        </p>
      )}

      {!skills && !error && <p className="mt-8 text-sm text-zinc-500">Loading…</p>}

      {skills && skills.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">
          No skills yet — be the first to publish one below.
        </p>
      )}

      {skills && skills.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <SkillCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </section>
  );
}
