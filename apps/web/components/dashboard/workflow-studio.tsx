"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, ChevronRight, Layers, Send, Sparkles, User } from "lucide-react";
import {
  generateWorkflow,
  getWorkflow,
  listWorkflows,
  seedWorkflows,
  type WorkflowDetail,
  type WorkflowNode,
  type WorkflowSummary,
} from "@/lib/api";

function describeWorkflow(wf: WorkflowDetail | null): string {
  if (!wf?.nodes?.length) return "No steps defined";
  const names = wf.nodes.map((n) => n.name).filter(Boolean);
  if (names.length <= 4) return names.join(" → ");
  return `${names.slice(0, 3).join(" → ")} → … (${names.length} steps)`;
}

function nodeTypeLabel(type: string): string {
  const base = type.split(".").pop() ?? type;
  return base.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

function WorkflowSteps({ nodes }: { nodes: WorkflowNode[] }) {
  if (!nodes.length) {
    return <p className="text-sm text-muted-foreground">No steps in this workflow.</p>;
  }

  return (
    <ol className="space-y-2">
      {nodes.map((node, i) => (
        <li key={`${node.name}-${i}`} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-xs font-semibold text-accent">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{node.name}</p>
            <p className="text-xs text-muted-foreground">{nodeTypeLabel(node.type)}</p>
          </div>
          {i < nodes.length - 1 && <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />}
        </li>
      ))}
    </ol>
  );
}

export function WorkflowStudio() {
  const [msgs, setMsgs] = useState<{ role: "agent" | "user"; text: string }[]>([
    { role: "agent", text: "Describe a workflow or seed built-in x402 templates." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [detail, setDetail] = useState<WorkflowDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const loadDetail = useCallback(async (id: number | string) => {
    setDetailLoading(true);
    try {
      const wf = await getWorkflow(id);
      setDetail({ ...wf, id: wf.id ?? id });
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshList = useCallback(async (preferId?: number | string) => {
    const list = await listWorkflows();
    const items = list.workflows ?? [];
    setWorkflows(items);

    const descEntries = await Promise.all(
      items.map(async (w) => {
        try {
          const wf = await getWorkflow(w.id);
          return [String(w.id), describeWorkflow(wf)] as const;
        } catch {
          return [String(w.id), "—"] as const;
        }
      }),
    );
    setDescriptions(Object.fromEntries(descEntries));

    const nextId = preferId ?? selectedId ?? items[0]?.id ?? null;
    if (nextId != null) {
      setSelectedId(nextId);
      await loadDetail(nextId);
    }
    return items;
  }, [loadDetail, selectedId]);

  useEffect(() => {
    refreshList().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectWorkflow(id: number | string) {
    setSelectedId(id);
    await loadDetail(id);
  }

  async function send(prompt: string) {
    const p = prompt.trim();
    if (!p || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: p }]);
    setBusy(true);
    try {
      const data = await generateWorkflow(p);
      setMsgs((m) => [...m, { role: "agent", text: `Built "${data.name}".` }]);
      setDetail(data);
      setSelectedId(data.id);
      await refreshList(data.id);
    } catch (e) {
      setMsgs((m) => [...m, { role: "agent", text: String(e) }]);
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    try {
      await seedWorkflows();
      const items = await refreshList();
      setMsgs((m) => [...m, { role: "agent", text: `Seeded ${items.length} workflow(s).` }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "agent", text: String(e) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)]">
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-frame">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">Workflow agent</span>
          <button
            onClick={seed}
            disabled={busy}
            className="ml-auto rounded-lg border border-border px-2 py-1 text-[10px] font-medium hover:bg-muted disabled:opacity-50"
          >
            <Layers className="mr-1 inline h-3 w-3" />
            Seed templates
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "agent" && <Bot className="mt-1 h-4 w-4 shrink-0 text-accent" />}
              <div className={`rounded-xl px-3 py-2 ${m.role === "user" ? "bg-foreground text-background" : "bg-muted"}`}>
                {m.text}
              </div>
              {m.role === "user" && <User className="mt-1 h-4 w-4 shrink-0" />}
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border p-3"
        >
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              placeholder="Describe a Kairos workflow…"
              className="flex-1 resize-none rounded-lg border border-border bg-background p-2 text-sm"
            />
            <button type="submit" disabled={busy} className="rounded-lg bg-accent px-3 disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Kairos Workflows</h1>
          <p className="text-sm text-muted-foreground">Workflow automation — x402 skills, session keys, settlement on Casper</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold">Your workflows</h2>
            {workflows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No workflows yet. Seed built-in templates or describe one in the chat.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((w) => (
                      <tr
                        key={w.id}
                        onClick={() => selectWorkflow(w.id)}
                        className={`cursor-pointer border-t border-border transition-colors hover:bg-muted/40 ${
                          selectedId === w.id ? "bg-accent/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-medium">{w.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{w.id}</td>
                        <td className="max-w-md truncate px-4 py-3 text-muted-foreground">
                          {descriptions[String(w.id)] ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              w.active ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {w.active ? "Active" : "Draft"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {detail?.name ? detail.name : "Workflow detail"}
              </h2>
              {detail && (
                <button
                  type="button"
                  onClick={() => setShowJson((v) => !v)}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                >
                  {showJson ? "Show steps" : "Show JSON"}
                </button>
              )}
            </div>

            {detailLoading ? (
              <p className="text-sm text-muted-foreground">Loading workflow…</p>
            ) : !detail ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Select a workflow from the table or generate one with the agent.
              </p>
            ) : showJson ? (
              <pre className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed">
                {JSON.stringify(detail, null, 2)}
              </pre>
            ) : (
              <WorkflowSteps nodes={detail.nodes ?? []} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
