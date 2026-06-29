"use client";

import { useRef, useState } from "react";
import { Sparkles, Send, ExternalLink, Bot, User } from "lucide-react";
import { gatewayUrl } from "@/lib/api";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL ?? "http://187.127.137.136:8089";

interface Msg {
  role: "user" | "agent";
  text: string;
}

const EXAMPLES = [
  "Agent that pays per call for a price feed skill via x402",
  "Hourly Casper rebalance using a scoped session key",
  "Settle an x402 payment then meter it in the usage ledger",
];

export function WorkflowStudio() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "agent",
      text: "Describe a workflow and I'll build it on Casper — x402 skill calls, session keys, settlement. It opens in the editor.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [wfId, setWfId] = useState<number | string>(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function send(prompt: string) {
    const p = prompt.trim();
    if (!p || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: p }]);
    setBusy(true);
    try {
      const res = await fetch(`${gatewayUrl}/workflows/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "generation failed");
      setMsgs((m) => [...m, { role: "agent", text: `Built “${data.name}”. Opening it now.` }]);
      setWfId(data.id);
      // Force the iframe to load the new workflow.
      if (iframeRef.current) iframeRef.current.src = `${N8N_URL}/workflow/${data.id}`;
    } catch (e) {
      setMsgs((m) => [...m, { role: "agent", text: `Couldn't build that: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen">
      {/* Chat panel */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">Workflow agent</span>
          <span className="ml-auto font-mono text-[10px] text-muted">deepseek</span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
              <div className="flex max-w-[90%] gap-2">
                {m.role === "agent" && (
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent/10 text-accent">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                )}
                <div
                  className={
                    m.role === "user"
                      ? "rounded-xl bg-accent px-3 py-2 text-sm text-white"
                      : "rounded-xl bg-surface-2 px-3 py-2 text-sm"
                  }
                >
                  {m.text}
                </div>
                {m.role === "user" && (
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-2">
                    <User className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </div>
          ))}
          {busy && <p className="pl-8 text-xs text-muted">Building workflow…</p>}
          {msgs.length <= 1 && (
            <div className="space-y-2 pt-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  onClick={() => send(e)}
                  className="block w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Describe a workflow…"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-border bg-bg p-2 text-sm outline-none focus-visible:border-accent/50"
            />
            <button
              type="submit"
              disabled={busy}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Editor */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight">Workflow editor</h1>
            <span className="font-mono text-xs text-muted">live · self-hosted</span>
          </div>
          <a
            href={`${N8N_URL}/workflow/${wfId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            <ExternalLink className="h-4 w-4" /> New tab
          </a>
        </div>
        <iframe
          ref={iframeRef}
          src={`${N8N_URL}/workflow/1`}
          title="Workflow editor"
          className="min-h-0 w-full flex-1 border-0"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
