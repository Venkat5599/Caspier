"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { listSkills, type SkillSummary } from "@/lib/api";
import { SkillCard } from "@/components/skill-card";
import { Button } from "@/components/ui/button";

export default function ApisPage() {
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
    <div className="mx-auto max-w-7xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">APIs</h1>
          <p className="mt-1 text-muted">
            Pay-per-call skills, served as REST + MCP endpoints from the catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Link href="/apis/create">
            <Button>
              <Plus className="h-4 w-4" /> Create API
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-8 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Could not reach the gateway. {error}
        </p>
      )}
      {!skills && !error && <p className="mt-8 text-sm text-muted">Loading…</p>}
      {skills && skills.length === 0 && (
        <p className="mt-8 text-sm text-muted">No APIs yet — create the first one.</p>
      )}
      {skills && skills.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <SkillCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
