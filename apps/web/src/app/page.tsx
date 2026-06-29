"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { listSkills, type SkillSummary } from "@/lib/api";
import { SkillCard } from "@/components/skill-card";
import { Button } from "@/components/ui/button";

export default function MarketplacePage() {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setSkills(null);
    listSkills()
      .then(setSkills)
      .catch((e) => setError(String(e)));
  }

  useEffect(load, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background: "radial-gradient(50% 60% at 70% 0%, rgba(99,102,241,0.12), transparent 70%)",
          }}
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            permissioned execution layer · Casper
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Agent skills, served as <span className="text-accent">endpoints.</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Turn a <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">SKILL.md</code>{" "}
            into a live REST and MCP endpoint — validated, sandboxed, and metered. Pay per call.
          </p>
          <div className="mt-7 flex gap-3">
            <Link href="/publish">
              <Button variant="accent">
                <Plus className="h-4 w-4" /> Publish a skill
              </Button>
            </Link>
            <a href="#skills">
              <Button variant="outline">Browse</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section id="skills" className="mt-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Live skills</h2>
            <p className="mt-1 text-sm text-muted">Published endpoints, served from the catalog.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {error && (
          <p className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
            Could not reach the gateway. {error}
          </p>
        )}
        {!skills && !error && <p className="mt-6 text-sm text-muted">Loading…</p>}
        {skills && skills.length === 0 && (
          <p className="mt-6 text-sm text-muted">No skills yet — publish the first one.</p>
        )}
        {skills && skills.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((s) => (
              <SkillCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
