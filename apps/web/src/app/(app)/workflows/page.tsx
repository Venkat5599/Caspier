import { ExternalLink } from "lucide-react";

// n8n editor, embedded full-view through the X-Frame-safe proxy.
const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL ?? "http://187.127.137.136:8089";

export default function WorkflowsPage() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold tracking-tight">Workflow editor</h1>
          <span className="font-mono text-xs text-muted">live · self-hosted</span>
        </div>
        <a
          href={N8N_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          <ExternalLink className="h-4 w-4" /> New tab
        </a>
      </div>
      <iframe
        src={`${N8N_URL}/workflow/1`}
        title="Workflow editor"
        className="min-h-0 w-full flex-1 border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
