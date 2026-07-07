"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowLeft, Server, Loader2, Search, Wrench, Workflow } from "lucide-react";
import { Panel, Field, Input, Textarea, Button, Empty, CopyBtn, Chip } from "./ui";
import { createFabricMcpServer, fabricMcpUrl, listFabricMcpServers, listSkills, type FabricMcpServer } from "@/lib/api";

const BUILTIN_TOOLS = ["caspier_chain_status", "caspier_budget", "list_skills", "get_skill", "fabric_reload"];

export function McpSection() {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<FabricMcpServer | null>(null);
  const [servers, setServers] = useState<FabricMcpServer[] | null>(null);
  const [q, setQ] = useState("");

  const load = () => listFabricMcpServers().then(setServers).catch(() => setServers([]));
  useEffect(() => {
    load();
  }, []);

  if (creating) return <CreateMcpForm onDone={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />;
  if (selected) return <McpDetail mcp={selected} onBack={() => setSelected(null)} />;

  const filtered = (servers ?? []).filter((s) => !q || (s.display_name + s.description).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">MCP Servers</h1>
          <p className="mt-1 text-neutral-400">Discover AI-ready MCP servers with tools and workflows for your agents.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Create
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search MCP servers…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>

      {servers === null ? (
        <Empty>
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty>No MCP servers yet.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <button key={s.id} type="button" onClick={() => setSelected(s)} className="text-left">
              <Panel className="h-full cursor-pointer transition hover:border-accent/40">
                <Server className="h-5 w-5 text-accent" />
                <p className="mt-3 text-lg font-semibold">{s.display_name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5" /> {(s.tools ?? []).length}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Workflow className="h-3.5 w-3.5" /> {(s.workflows ?? []).length}
                  </span>
                </div>
              </Panel>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function McpDetail({ mcp, onBack }: { mcp: FabricMcpServer; onBack: () => void }) {
  const url = `${fabricMcpUrl}/mcp`;
  const cmd = `claude mcp add ${mcp.slug ?? "caspier"} --transport http ${url}`;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-3xl font-semibold">{mcp.display_name}</h1>
      <Panel>
        <p className="text-sm text-muted-foreground">{mcp.description}</p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border px-3 py-2">
          <span className="flex-1 truncate font-mono text-xs">{url}</span>
          <CopyBtn text={url} />
        </div>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs">{cmd}</pre>
        <div className="mt-4 flex flex-wrap gap-2">
          {(mcp.tools ?? []).map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function CreateMcpForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({ slug: "", display_name: "", description: "", is_public: false });
  const [tools, setTools] = useState<string[]>([...BUILTIN_TOOLS]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listSkills().then((skills) => {
      setTools((t) => [...t, ...skills.map((s) => `api__${s.slug}`)]);
    }).catch(() => {});
  }, []);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await createFabricMcpServer({ ...f, tools, workflows: [] });
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
      <h1 className="text-3xl font-semibold">Create MCP Server</h1>
      <Panel className="space-y-4">
        <Field label="Slug">
          <Input value={f.slug} onChange={(e) => setF((s) => ({ ...s, slug: e.target.value }))} />
        </Field>
        <Field label="Display name">
          <Input value={f.display_name} onChange={(e) => setF((s) => ({ ...s, display_name: e.target.value }))} />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={f.description} onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))} />
        </Field>
        <p className="text-xs text-muted-foreground">{tools.length} tools will be registered (builtins + api__*)</p>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <Button onClick={submit} disabled={busy || !f.display_name}>
          Create
        </Button>
      </Panel>
    </div>
  );
}
