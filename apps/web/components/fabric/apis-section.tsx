"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft, Store, Loader2, Search, Zap, Play, Terminal } from "lucide-react";
import { Panel, Input, Button, Chip, Empty, CopyBtn } from "./ui";
import { gatewayUrl, listSkills, runFabricApi, type SkillSummary } from "@/lib/api";

export function ApisSection() {
  const [selected, setSelected] = useState<SkillSummary | null>(null);
  const [apis, setApis] = useState<SkillSummary[] | null>(null);
  const [q, setQ] = useState("");

  const load = () => listSkills().then(setApis).catch(() => setApis([]));
  useEffect(() => {
    load();
  }, []);

  if (selected) return <ApiDetail api={selected} onBack={() => setSelected(null)} />;

  const filtered = (apis ?? []).filter(
    (a) => !q || (a.name + a.slug + a.description).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">APIs</h1>
          <p className="mt-1 text-neutral-400">Payment-gated skill proxies — pay per call over x402, settled on Casper.</p>
        </div>
        <Link href="/dashboard?tab=apis">
          <Button>
            <Plus className="h-4 w-4" /> Create API
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input placeholder="Search skills…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>

      {apis === null ? (
        <Empty>
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty>No skills yet. Publish SKILL.md to create your first api__ tool.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((a) => (
            <button key={a.id} type="button" onClick={() => setSelected(a)} className="text-left">
              <Panel className="h-full cursor-pointer transition hover:border-accent/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <Store className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-lg font-semibold text-white">{a.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{a.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip accent>
                    {a.pricePerCall === "0" ? "Free" : `${a.pricePerCall} ${a.asset}`}
                  </Chip>
                  <Chip>api__{a.slug}</Chip>
                </div>
              </Panel>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ApiDetail({ api, onBack }: { api: SkillSummary; onBack: () => void }) {
  const endpoint = `${gatewayUrl}/s/${api.slug}`;
  const curl = [
    `# 1. call — unpaid requests get x402 quote (HTTP 402)`,
    `curl -i -X POST ${endpoint} -H 'content-type: application/json' -d '{}'`,
    ``,
    `# 2. pay on Casper, retry with proof headers:`,
    `curl -X POST ${endpoint} \\`,
    `  -H 'content-type: application/json' \\`,
    `  -H 'X-PAYMENT-NONCE: <nonce>' \\`,
    `  -H 'X-PAYMENT-PROOF: casper:deploy:<hash>' \\`,
    `  -d '{}'`,
  ].join("\n");

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to skills
      </button>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
          <Store className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{api.name}</h1>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Chip accent>
              <Zap className="h-3 w-3" /> {api.pricePerCall} {api.asset} / call
            </Chip>
            <Chip>api__{api.slug}</Chip>
          </div>
        </div>
      </div>
      <Panel>
        <p className="text-sm text-muted-foreground">{api.description}</p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3.5 py-2.5">
          <span className="text-xs text-muted-foreground">Endpoint</span>
          <span className="flex-1 truncate font-mono text-xs">{endpoint}</span>
          <CopyBtn text={endpoint} />
        </div>
      </Panel>
      <Panel>
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-accent" />
          <p className="font-semibold">How to use (x402)</p>
        </div>
        <div className="relative mt-4">
          <pre className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs">{curl}</pre>
          <div className="absolute top-3 right-3">
            <CopyBtn text={curl} />
          </div>
        </div>
      </Panel>
      <TestApi slug={api.slug} />
    </div>
  );
}

function TestApi({ slug }: { slug: string }) {
  const [argsText, setArgsText] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; status?: number; body?: unknown; error?: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setRes(null);
    let args: Record<string, unknown> = {};
    try {
      args = argsText.trim() ? (JSON.parse(argsText) as Record<string, unknown>) : {};
    } catch {
      setRes({ ok: false, error: "invalid JSON" });
      setBusy(false);
      return;
    }
    try {
      setRes(await runFabricApi(slug, args));
    } catch (e) {
      setRes({ ok: false, error: String((e as Error).message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4 text-accent" />
        <p className="font-semibold">Test invoke</p>
        <Chip accent>live</Chip>
      </div>
      <textarea
        rows={3}
        value={argsText}
        onChange={(e) => setArgsText(e.target.value)}
        className="mt-4 w-full rounded-xl border border-border bg-background p-3 font-mono text-sm"
      />
      <div className="mt-3">
        <Button onClick={run} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Send
        </Button>
      </div>
      {res && (
        <pre className="mt-4 max-h-72 overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs">
          {JSON.stringify(res, null, 2)}
        </pre>
      )}
    </Panel>
  );
}
