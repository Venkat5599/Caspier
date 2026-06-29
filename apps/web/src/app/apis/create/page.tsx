"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { publishSkill, type PublishError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RUNTIMES = ["code", "llm", "hybrid"] as const;

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Assemble a SKILL.md from form state. */
function buildSkill(f: {
  name: string;
  version: string;
  description: string;
  runtime: string;
  price: string;
  asset: string;
  egress: string;
  body: string;
}): string {
  const hosts = f.egress
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((h) => `    - ${h}`)
    .join("\n");
  return `---
name: ${f.name}
version: ${f.version}
description: ${f.description}
runtime: ${f.runtime}
pricing:
  pricePerCall: "${f.price}"
  asset: ${f.asset}
inputSchema:
  type: object
outputSchema:
  type: object
scope:
  egress:
${hosts || "    - api.example.com"}
---

${f.body}
`;
}

export default function CreateApiPage() {
  const router = useRouter();
  const [f, setF] = useState({
    name: "My Awesome API",
    version: "0.1.0",
    description: "Describe what your API does…",
    runtime: "code",
    price: "1000",
    asset: "USDC",
    egress: "api.example.com",
    body: "# My Awesome API\n\nWhat this skill does, step by step.",
  });
  const [result, setResult] = useState<{ id: string; slug: string } | null>(null);
  const [error, setError] = useState<PublishError | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const preview = useMemo(() => buildSkill(f), [f]);
  const slug = slugify(f.name);

  async function onPublish() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const r = await publishSkill(preview);
      setResult(r);
      setTimeout(() => router.push("/apis"), 1200);
    } catch (e) {
      setError(e as PublishError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-3xl font-extrabold tracking-tight">Create API</h1>
      <p className="mt-1 text-muted">Set up a payment-gated, sandboxed skill endpoint via x402.</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* Form */}
        <div className="space-y-6">
          <Field label="Name" hint={`Slug: /apis/${slug}`}>
            <Input value={f.name} onChange={set("name")} />
          </Field>
          <Field label="Description">
            <Input value={f.description} onChange={set("description")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Version">
              <Input value={f.version} onChange={set("version")} placeholder="0.1.0" />
            </Field>
            <Field label="Runtime" hint="Sandbox engine">
              <select
                value={f.runtime}
                onChange={set("runtime")}
                className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-foreground outline-none focus-visible:border-accent/50"
              >
                {RUNTIMES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price per call" hint="Smallest unit (0 = free)">
              <Input value={f.price} onChange={set("price")} />
            </Field>
            <Field label="Asset">
              <Input value={f.asset} onChange={set("asset")} />
            </Field>
          </div>
          <Field label="Egress allowlist" hint="Hosts the sandbox may reach (comma / space separated)">
            <Input value={f.egress} onChange={set("egress")} />
          </Field>
          <Field label="Body" hint="Markdown describing the skill behavior">
            <Textarea value={f.body} onChange={set("body")} className="h-40" />
          </Field>

          <Button onClick={onPublish} disabled={busy} size="lg">
            {busy ? "Publishing…" : "Publish API"}
          </Button>

          {result && (
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent">
                  <CheckCircle2 className="h-4 w-4" /> Published — {result.id}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted">Redirecting to APIs…</CardContent>
            </Card>
          )}
          {error && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" /> {error.error}
                </CardTitle>
              </CardHeader>
              {error.details && (
                <CardContent>
                  <ul className="space-y-1 font-mono text-xs text-muted">
                    {error.details.map((d) => (
                      <li key={d}>• {d}</li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Live SKILL.md preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 font-mono text-xs text-muted">SKILL.md preview</p>
          <pre className="max-h-[34rem] overflow-auto rounded-xl border border-border bg-bg p-4 font-mono text-xs leading-relaxed text-foreground">
            {preview}
          </pre>
        </div>
      </div>
    </div>
  );
}
