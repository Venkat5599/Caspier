"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { publishSkill, type PublishError, type PublishResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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

export default function PublishPage() {
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
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Publish a skill</h1>
      <p className="mt-1 text-sm text-muted">
        Paste a SKILL.md. It is validated, then served as a REST + MCP endpoint, metered per call.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          className="h-[28rem]"
        />

        <div className="space-y-4">
          <Button variant="accent" className="w-full" onClick={onPublish} disabled={busy}>
            {busy ? "Publishing…" : "Publish"}
          </Button>

          {result && (
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent">
                  <CheckCircle2 className="h-4 w-4" /> Published
                </CardTitle>
                <CardDescription className="font-mono text-foreground">{result.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted">
                  Live at <span className="font-mono">/skills/{result.slug}</span>
                </p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-400">
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
      </div>
    </div>
  );
}
