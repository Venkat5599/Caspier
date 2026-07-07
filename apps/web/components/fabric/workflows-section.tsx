"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowLeft, Loader2, Search, Play, Globe } from "lucide-react";
import { Panel, Field, Input, Textarea, Button, Toggle, Chip, Empty } from "./ui";
import {
  createFabricWorkflow,
  listFabricWorkflows,
  runFabricWorkflow,
  seedFabricWorkflows,
  type FabricWorkflow,
} from "@/lib/api";

export function WorkflowsSection() {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<FabricWorkflow | null>(null);
  const [wfs, setWfs] = useState<FabricWorkflow[] | null>(null);
  const [q, setQ] = useState("");

  const load = () => listFabricWorkflows().then(setWfs).catch(() => setWfs([]));
  useEffect(() => {
    load();
  }, []);

  if (creating) return <CreateWorkflowForm onDone={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />;
  if (selected) return <WorkflowDetail wf={selected} onBack={() => setSelected(null)} />;

  const filtered = (wfs ?? []).filter((w) => !q || (w.name + w.description).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Workflows</h1>
          <p className="mt-1 text-neutral-400">Reusable, composable flows agents run — HTTP calls + on-chain Casper operations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedFabricWorkflows().then(load)}>
            Seed demo
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search workflows…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>

      {wfs === null ? (
        <Empty>
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty>No workflows yet. Seed the pay-if-budget demo or create one.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((w) => (
            <button key={w.id} type="button" onClick={() => setSelected(w)} className="text-left">
              <Panel className="h-full cursor-pointer transition hover:border-accent/40">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{w.name}</p>
                  {w.is_public && <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">wf__{w.slug}</p>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{w.description}</p>
                <div className="mt-4 flex gap-2">
                  {(w.tags ?? []).map((t) => (
                    <Chip key={t} accent={t === "onchain"}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </Panel>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowDetail({ wf, onBack }: { wf: FabricWorkflow; onBack: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<unknown>(null);

  const run = async () => {
    setBusy(true);
    try {
      setRes(await runFabricWorkflow(wf.slug ?? wf.name, vals));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-3xl font-semibold">{wf.name}</h1>
      <Panel>
        <p className="text-sm text-muted-foreground">{wf.description}</p>
        <p className="mt-2 font-mono text-xs">MCP tool: wf__{wf.slug}</p>
      </Panel>
      <Panel className="space-y-3">
        <p className="font-semibold">Run workflow</p>
        {(wf.input_variables ?? []).map((v) => (
          <Field key={v.name} label={v.name}>
            <Input value={vals[v.name] ?? ""} onChange={(e) => setVals((s) => ({ ...s, [v.name]: e.target.value }))} className="font-mono" />
          </Field>
        ))}
        <Button onClick={run} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run
        </Button>
        {res != null && (
          <pre className="mt-4 overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs">
            {JSON.stringify(res, null, 2)}
          </pre>
        )}
      </Panel>
    </div>
  );
}

function CreateWorkflowForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [meta, setMeta] = useState({ name: "", slug: "", description: "", is_public: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await createFabricWorkflow({
        ...meta,
        input_variables: [
          { name: "recipient", required: true },
          { name: "amount", required: true },
        ],
        steps: [
          { id: "gate", kind: "condition", left: "{{input.amount}}", op: "<=", right: "5000000000" },
          { id: "settle", kind: "onchain", action: "casper_transfer", recipient: "{{input.recipient}}", amount: "{{input.amount}}" },
        ],
        output_mapping: [{ name: "deployHash", from: "{{steps.settle.output.deployHash}}" }],
        tags: ["onchain", "x402"],
      });
      onDone();
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onCancel} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-4xl font-semibold">Create Workflow</h1>
      <Panel className="space-y-4">
        <Field label="Name">
          <Input value={meta.name} onChange={(e) => setMeta((s) => ({ ...s, name: e.target.value }))} />
        </Field>
        <Field label="Slug">
          <Input value={meta.slug} onChange={(e) => setMeta((s) => ({ ...s, slug: e.target.value }))} />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={meta.description} onChange={(e) => setMeta((s) => ({ ...s, description: e.target.value }))} />
        </Field>
        <Toggle on={meta.is_public} onChange={(v) => setMeta((s) => ({ ...s, is_public: v }))} label="Public" desc="List in marketplace" />
        {err && <p className="text-sm text-red-500">{err}</p>}
        <Button onClick={submit} disabled={busy || !meta.name}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
        </Button>
      </Panel>
    </div>
  );
}
