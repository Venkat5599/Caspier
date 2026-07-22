/**
 * Service router — discover, compare, route.
 *
 * An agent that needs a capability should not have to know which published
 * service to call. This ranks the candidates that can serve a request, picks
 * one under a stated strategy, and reports *why* it chose that one, so the
 * decision is auditable rather than magic.
 *
 * Every input is measured, never assumed: price comes from the published
 * manifest, latency and success rate from recorded invocations. A candidate
 * with no history is marked unknown rather than given a flattering default.
 */

export type RouteStrategy = "cheapest" | "fastest" | "balanced";

export type RouteCandidate = {
  slug: string;
  name: string;
  kind: "api" | "skill";
  /** Price per call in wei, as an integer string. */
  priceWei: string;
  /** Recorded invocations behind the stats below. */
  samples: number;
  /** 0..1. Meaningless when `samples` is 0 — read them together. */
  successRate: number;
  /** Median observed latency. Undefined when nothing has been measured yet. */
  p50LatencyMs?: number;
};

export type RankedCandidate = RouteCandidate & {
  /** Lower is better. Comparable only within a single ranking call. */
  score: number;
  latencyKnown: boolean;
  reason: string;
};

export type RouteDecision = {
  strategy: RouteStrategy;
  capability: string | null;
  chosen: RankedCandidate | null;
  ranked: RankedCandidate[];
  /** Plain-language account of how the winner was picked. */
  rationale: string;
};

/** Weights for `balanced`. Price and speed matter equally; reliability breaks ties. */
const W_PRICE = 0.4;
const W_LATENCY = 0.4;
const W_RELIABILITY = 0.2;

/** Scale a value into 0..1 across the observed range. A flat range scores 0. */
function normalise(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  if (max <= min) return 0;
  return (value - min) / (max - min);
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
}

/** Median latency from recorded durations. Used by the gateway to build candidates. */
export function p50(durationsMs: number[]): number | undefined {
  return median(durationsMs);
}

/**
 * Match a candidate against a free-text capability. Deliberately simple and
 * predictable — substring over slug, name and description — because a routing
 * decision an operator cannot reproduce by eye is worse than a crude one.
 */
export function matchesCapability(
  candidate: { slug: string; name: string; description?: string | null },
  capability?: string | null,
): boolean {
  if (!capability?.trim()) return true;
  const needle = capability.trim().toLowerCase();
  const haystack = `${candidate.slug} ${candidate.name} ${candidate.description ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

function money(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Rank candidates under a strategy. Pure — the caller supplies the candidate
 * set, so this is fully testable without a catalog or a network.
 */
export function rankCandidates(
  candidates: RouteCandidate[],
  strategy: RouteStrategy = "balanced",
  capability: string | null = null,
): RouteDecision {
  if (candidates.length === 0) {
    return {
      strategy,
      capability,
      chosen: null,
      ranked: [],
      rationale: capability
        ? `No published service matches '${capability}'.`
        : "No published services to route to.",
    };
  }

  const prices = candidates.map((c) => money(c.priceWei));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const latencies = candidates
    .filter((c) => typeof c.p50LatencyMs === "number")
    .map((c) => c.p50LatencyMs!);
  const minLat = latencies.length ? Math.min(...latencies) : 0;
  const maxLat = latencies.length ? Math.max(...latencies) : 0;
  // An unmeasured candidate sits at the median of what *is* known, so it is
  // neither rewarded nor punished for having no history.
  const assumedLat = median(latencies);

  const ranked: RankedCandidate[] = candidates.map((c) => {
    const price = money(c.priceWei);
    const latencyKnown = typeof c.p50LatencyMs === "number";
    const lat = latencyKnown ? c.p50LatencyMs! : assumedLat;

    const priceScore = normalise(price, minPrice, maxPrice);
    const latScore = lat === undefined ? 0.5 : normalise(lat, minLat, maxLat);
    const reliabilityScore = 1 - Math.min(1, Math.max(0, c.successRate));

    let score: number;
    let reason: string;

    if (strategy === "cheapest") {
      score = priceScore;
      reason = `${price} wei per call`;
    } else if (strategy === "fastest") {
      // An unmeasured candidate falls behind every measured one, rather than
      // winning by default on a number nobody has.
      score = latencyKnown ? normalise(c.p50LatencyMs!, minLat, maxLat) : 1.1;
      reason = latencyKnown
        ? `p50 ${c.p50LatencyMs}ms over ${c.samples} call(s)`
        : "no latency samples yet";
    } else {
      score = W_PRICE * priceScore + W_LATENCY * latScore + W_RELIABILITY * reliabilityScore;
      reason =
        `${price} wei · ` +
        (latencyKnown ? `p50 ${c.p50LatencyMs}ms` : "latency unmeasured") +
        ` · ${Math.round(c.successRate * 100)}% success over ${c.samples} call(s)`;
    }

    return { ...c, score, latencyKnown, reason };
  });

  ranked.sort((a, b) => a.score - b.score || money(a.priceWei) - money(b.priceWei));

  const chosen = ranked[0]!;
  const how =
    strategy === "cheapest"
      ? "lowest price per call"
      : strategy === "fastest"
        ? "lowest measured p50 latency"
        : "price, latency and success rate weighted 40/40/20";

  const caveat = ranked.some((r) => !r.latencyKnown)
    ? " Some candidates have no recorded calls, so their latency is unmeasured."
    : "";

  return {
    strategy,
    capability,
    chosen,
    ranked,
    rationale: `Chose '${chosen.slug}' of ${ranked.length} candidate(s) by ${how} — ${chosen.reason}.${caveat}`,
  };
}
