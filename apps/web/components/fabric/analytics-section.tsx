"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Panel, Empty } from "./ui";
import {
  getFabricStats,
  getNoxClosedEpoch,
  getNoxStatus,
  listWorkflowRuns,
  type FabricStats,
  type WorkflowRunRecord,
} from "@/lib/api";

/**
 * Payment analytics over confidential settlements.
 *
 * The design problem worth naming: analytics normally work by reading every
 * transaction. Here individual amounts are encrypted and decryptable only by
 * the owner and the paying agent, so per-payment charts are not merely
 * withheld — they are not computable.
 *
 * What *is* public is each closed batch: an aggregate released by `flushEpoch`
 * plus the number of settlements it covered. Every figure below derives from
 * those two numbers, so the dashboard stays useful without weakening the
 * privacy model. Nothing is estimated or interpolated; an epoch with no data
 * shows as having no data.
 */

interface EpochPoint {
  epoch: number;
  totalWei: number;
  count: number;
}

/** How many recent epochs to walk. Each is a separate round trip. */
const EPOCH_WINDOW = 12;

function compact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 font-mono text-2xl text-white">{value}</div>
      {note && <div className="mt-0.5 text-[11px] text-neutral-600">{note}</div>}
    </div>
  );
}

/**
 * Settlement volume per closed batch.
 *
 * Deliberately one bar per *batch*, never per payment — the batch is the finest
 * grain that exists publicly, and drawing anything finer would imply a
 * resolution the protocol does not expose.
 */
function VolumeChart({ points }: { points: EpochPoint[] }) {
  const peak = Math.max(...points.map((p) => p.totalWei), 1);

  return (
    <div className="flex h-40 items-end gap-2">
      {points.map((p) => {
        // Floor the height so a small-but-real batch stays visible instead of
        // collapsing into an invisible sliver.
        const pct = p.totalWei === 0 ? 0 : Math.max(6, (p.totalWei / peak) * 100);
        return (
          <div key={p.epoch} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="relative flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-accent/70 transition-colors group-hover:bg-accent"
                style={{ height: `${pct}%` }}
              />
              <div className="pointer-events-none absolute -top-1 left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200 group-hover:block">
                {p.totalWei.toLocaleString()} wei · {p.count} settlement
                {p.count === 1 ? "" : "s"}
              </div>
            </div>
            <div className="font-mono text-[10px] text-neutral-600">{p.epoch}</div>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsSection() {
  const [stats, setStats] = useState<FabricStats | null>(null);
  const [points, setPoints] = useState<EpochPoint[]>([]);
  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [s, nox, r] = await Promise.all([
        getFabricStats().catch(() => null),
        getNoxStatus().catch(() => null),
        listWorkflowRuns(undefined, 50).catch(() => []),
      ]);
      setStats(s);
      setRuns(r);

      // Only epochs strictly before the open one are closed, and only closed
      // epochs have released an aggregate.
      const open = nox?.epoch ?? 0;
      const closed = Array.from(
        { length: Math.min(EPOCH_WINDOW, Math.max(0, open)) },
        (_, i) => open - 1 - i,
      )
        .filter((e) => e >= 0)
        .reverse();

      const results = await Promise.all(
        closed.map((e) =>
          getNoxClosedEpoch(e)
            .then((d) =>
              d.closed ? { epoch: e, totalWei: Number(d.totalWei ?? 0), count: d.count ?? 0 } : null,
            )
            .catch(() => null),
        ),
      );
      setPoints(results.filter((p): p is EpochPoint => p !== null));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const settled = points.reduce((sum, p) => sum + p.totalWei, 0);
  const payments = points.reduce((sum, p) => sum + p.count, 0);
  const batches = points.length;
  // The privacy dividend, quantified: one public movement stands in for N
  // payments, so this is how far the payment graph is compressed.
  const perBatch = batches > 0 ? payments / batches : 0;

  const failed = runs.filter((r) => r.status === "failed").length;
  const durations = runs.map((r) => r.duration_ms ?? 0).filter((d) => d > 0);
  const medianMs =
    durations.length > 0
      ? [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)]!
      : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading settlement history from the chain…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <h2 className="text-lg font-semibold text-white">Analytics</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          Every figure here comes from public batch aggregates. Individual payment amounts
          are encrypted and are not decryptable by this dashboard — so these are the numbers
          analytics can honestly report without weakening the privacy model.
        </p>
      </Panel>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Settled volume"
          value={`${compact(settled)} wei`}
          note={`across ${batches} closed batch${batches === 1 ? "" : "es"}`}
        />
        <Metric
          label="Payments settled"
          value={payments.toLocaleString()}
          note="individual amounts stay encrypted"
        />
        <Metric
          label="Payments per batch"
          value={perBatch > 0 ? perBatch.toFixed(1) : "—"}
          note="how far the payment graph is compressed"
        />
        <Metric
          label="Metered requests"
          value={(stats?.totals?.requests ?? 0).toLocaleString()}
          note={`${stats?.totals?.successRate ?? 0}% success`}
        />
      </div>

      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Settlement volume by batch</h3>
          <span className="text-[11px] text-neutral-600">
            one bar per closed epoch — the finest public grain
          </span>
        </div>

        <div className="mt-4">
          {points.length === 0 ? (
            <Empty>
              No closed batches yet. Settle a payment, then flush the epoch to release an
              aggregate.
            </Empty>
          ) : (
            <VolumeChart points={points} />
          )}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h3 className="text-sm font-semibold text-white">Catalog</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {[
              ["APIs published", stats?.totals?.apis ?? 0],
              ["MCP servers", stats?.totals?.mcpServers ?? 0],
              ["Workflows", stats?.totals?.workflows ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-baseline justify-between gap-4">
                <dt className="text-neutral-400">{label}</dt>
                <dd className="font-mono text-white">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel>
          <h3 className="text-sm font-semibold text-white">Execution</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-400">Runs recorded</dt>
              <dd className="font-mono text-white">{runs.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-400">Failed</dt>
              <dd className={`font-mono ${failed > 0 ? "text-amber-400" : "text-white"}`}>
                {failed}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-400">Median duration</dt>
              <dd className="font-mono text-white">
                {medianMs > 0 ? `${medianMs.toLocaleString()} ms` : "—"}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel>
        <h3 className="text-sm font-semibold text-white">What this dashboard cannot show</h3>
        <ul className="mt-2 space-y-1 text-sm text-neutral-400">
          <li>the amount of any individual payment</li>
          <li>which agent paid which recipient</li>
          <li>an agent&apos;s cap or running total, unless you hold its key</li>
        </ul>
        <p className="mt-2 text-[11px] text-neutral-600">
          Not omissions. Those values are encrypted on-chain, and no amount of dashboard
          access recovers them.
        </p>
      </Panel>
    </div>
  );
}
