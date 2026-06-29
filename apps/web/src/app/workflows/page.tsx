import { ExternalLink, Workflow } from "lucide-react";

// n8n editor, embedded live through the X-Frame-safe proxy.
const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL ?? "http://187.127.137.136:8089";

export default function WorkflowsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Workflows</h1>
          <p className="mt-1 text-muted">
            Compose skills, x402 calls, and on-chain actions into reusable automations — a live,
            self-hosted workflow editor, running below.
          </p>
        </div>
        <a
          href={N8N_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          <ExternalLink className="h-4 w-4" /> Open full editor
        </a>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
          <Workflow className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Workflow editor</span>
          <span className="ml-auto font-mono text-xs text-muted">live</span>
        </div>
        <iframe
          src={N8N_URL}
          title="n8n workflow editor"
          className="h-[78vh] w-full"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      <p className="mt-4 text-center font-mono text-xs text-muted">
        Self-hosted workflow engine on the Agent Fabric VPS.
      </p>
    </div>
  );
}
