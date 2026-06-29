import { useState } from "react";
import { publishSkill, type PublishError, type PublishResult } from "../lib/api";

const EXAMPLE = `---
name: hello-weather
version: 0.1.0
description: Returns a one-line weather summary for a city.
runtime: code
pricing:
  pricePerCall: "1000"
  asset: USDC
inputSchema:
  type: object
  required: [city]
  properties:
    city:
      type: string
outputSchema:
  type: object
  required: [summary]
  properties:
    summary:
      type: string
scope:
  egress:
    - api.open-meteo.com
---

# hello-weather

Given a city, fetch current conditions and return a one-sentence summary.
`;

export default function PublishPanel() {
  const [source, setSource] = useState(EXAMPLE);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState<PublishError | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPublish() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      setResult(await publishSkill(source));
    } catch (e) {
      setError(e as PublishError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="publish" className="border-t border-white/5 bg-white/[0.01]">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-2xl font-bold tracking-tight">Publish a skill</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Paste a SKILL.md. It is validated, then served as a REST + MCP endpoint.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="h-96 w-full resize-none rounded-2xl border border-white/10 bg-void p-4 font-mono text-xs leading-relaxed text-zinc-200 outline-none focus:border-emerald-glow/40"
          />

          <div className="flex flex-col">
            <button
              onClick={onPublish}
              disabled={busy}
              className="rounded-xl bg-emerald-glow px-5 py-2.5 text-sm font-semibold text-void transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {busy ? "Publishing…" : "Publish"}
            </button>

            {result && (
              <div className="mt-4 rounded-xl border border-emerald-glow/20 bg-emerald-glow/5 p-4">
                <p className="font-mono text-sm text-emerald-glow">✓ {result.id}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Live at <span className="font-mono">/skills/{result.slug}</span>
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-amber-glow/20 bg-amber-glow/5 p-4">
                <p className="font-mono text-sm text-amber-glow">{error.error}</p>
                {error.details && (
                  <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                    {error.details.map((d) => (
                      <li key={d} className="font-mono">
                        • {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
