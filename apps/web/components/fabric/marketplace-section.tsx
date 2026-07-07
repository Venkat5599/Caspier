"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Server, Store, Workflow, Wrench, Globe } from "lucide-react";
import { Panel, Input, Empty, Chip, CopyBtn, short } from "./ui";
import {
  fabricMcpUrl,
  listFabricMcpServers,
  listFabricWorkflows,
  listSkills,
  type FabricMcpServer,
  type FabricWorkflow,
  type SkillSummary,
} from "@/lib/api";

export function MarketplaceSection() {
  const [mcps, setMcps] = useState<FabricMcpServer[] | null>(null);
  const [apis, setApis] = useState<SkillSummary[] | null>(null);
  const [wfs, setWfs] = useState<FabricWorkflow[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    listFabricMcpServers("public").then(setMcps).catch(() => setMcps([]));
    listSkills().then(setApis).catch(() => setApis([]));
    listFabricWorkflows("public").then(setWfs).catch(() => setWfs([]));
  }, []);

  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const fMcps = (mcps ?? []).filter((m) => match(m.display_name + (m.description ?? "")));
  const fApis = (apis ?? []).filter((a) => match(a.name + a.description));
  const fWfs = (wfs ?? []).filter((w) => match(w.name + (w.description ?? "")));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-white">Marketplace</h1>
        <p className="mt-1 text-neutral-400">Public MCP servers, APIs, and workflows published by everyone — discover and connect.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search the marketplace…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Server className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">MCP Servers</p>
        </div>
        {mcps === null ? (
          <Empty>
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </Empty>
        ) : fMcps.length === 0 ? (
          <Empty>No public MCP servers yet.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {fMcps.map((m) => {
              const url = `${fabricMcpUrl}/mcp`;
              const cmd = `claude mcp add ${m.slug} --transport http ${url}`;
              return (
                <Panel key={m.id}>
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-accent" />
                    <p className="font-semibold">{m.display_name}</p>
                    <Globe className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5" /> {(m.tools ?? []).length} tools
                    </span>
                    <span className="font-mono">{short(m.owner_address, 5, 4)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <span className="flex-1 truncate font-mono text-[11px]">{url}</span>
                    <CopyBtn text={cmd} />
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Store className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skills</p>
        </div>
        {apis === null ? (
          <Empty>
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </Empty>
        ) : fApis.length === 0 ? (
          <Empty>No published skills yet.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {fApis.map((a) => (
              <Panel key={a.id}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{a.name}</p>
                  <Chip accent>{a.pricePerCall === "0" ? "Free" : `${a.pricePerCall} ${a.asset}`}</Chip>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">api__{a.slug}</p>
              </Panel>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Workflow className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Workflows</p>
        </div>
        {wfs === null ? (
          <Empty>
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </Empty>
        ) : fWfs.length === 0 ? (
          <Empty>No public workflows yet.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {fWfs.map((w) => (
              <Panel key={w.id}>
                <p className="font-semibold">{w.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">wf__{w.slug}</p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{w.description}</p>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
