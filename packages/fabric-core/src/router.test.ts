import { describe, expect, it } from "bun:test";
import { rankCandidates, matchesCapability, p50, type RouteCandidate } from "./router.ts";

const c = (over: Partial<RouteCandidate> & { slug: string }): RouteCandidate => ({
  name: over.slug,
  kind: "api",
  priceWei: "1000",
  samples: 10,
  successRate: 1,
  ...over,
});

describe("capability matching", () => {
  const weather = { slug: "hello-weather", name: "Weather", description: "forecast by city" };

  it("matches on slug, name or description", () => {
    expect(matchesCapability(weather, "weather")).toBe(true);
    expect(matchesCapability(weather, "forecast")).toBe(true);
    expect(matchesCapability(weather, "Weather")).toBe(true);
  });

  it("rejects a miss, and an empty query matches everything", () => {
    expect(matchesCapability(weather, "translation")).toBe(false);
    expect(matchesCapability(weather, "")).toBe(true);
    expect(matchesCapability(weather, null)).toBe(true);
  });
});

describe("p50", () => {
  it("returns the median, and undefined with no samples", () => {
    expect(p50([100])).toBe(100);
    expect(p50([300, 100, 200])).toBe(200);
    expect(p50([100, 200, 300, 400])).toBe(250);
    expect(p50([])).toBeUndefined();
  });
});

describe("rankCandidates", () => {
  it("reports honestly when there is nothing to route to", () => {
    const d = rankCandidates([], "cheapest", "weather");
    expect(d.chosen).toBeNull();
    expect(d.ranked).toEqual([]);
    expect(d.rationale).toContain("No published service matches 'weather'");
  });

  it("cheapest picks the lowest price regardless of speed", () => {
    const d = rankCandidates(
      [
        c({ slug: "fast-pricey", priceWei: "9000", p50LatencyMs: 50 }),
        c({ slug: "slow-cheap", priceWei: "100", p50LatencyMs: 900 }),
      ],
      "cheapest",
    );
    expect(d.chosen!.slug).toBe("slow-cheap");
    expect(d.rationale).toContain("lowest price per call");
  });

  it("fastest picks the lowest measured latency regardless of price", () => {
    const d = rankCandidates(
      [
        c({ slug: "fast-pricey", priceWei: "9000", p50LatencyMs: 50 }),
        c({ slug: "slow-cheap", priceWei: "100", p50LatencyMs: 900 }),
      ],
      "fastest",
    );
    expect(d.chosen!.slug).toBe("fast-pricey");
  });

  it("never lets an unmeasured candidate win 'fastest' by default", () => {
    const d = rankCandidates(
      [
        c({ slug: "unmeasured", priceWei: "1", samples: 0 }),
        c({ slug: "measured", priceWei: "5000", p50LatencyMs: 400 }),
      ],
      "fastest",
    );
    expect(d.chosen!.slug).toBe("measured");
    const unmeasured = d.ranked.find((r) => r.slug === "unmeasured")!;
    expect(unmeasured.latencyKnown).toBe(false);
    expect(unmeasured.reason).toBe("no latency samples yet");
  });

  it("balanced trades price against latency", () => {
    const d = rankCandidates(
      [
        c({ slug: "extreme-cheap-slow", priceWei: "10", p50LatencyMs: 5000 }),
        c({ slug: "middle", priceWei: "1200", p50LatencyMs: 120 }),
        c({ slug: "extreme-fast-pricey", priceWei: "100000", p50LatencyMs: 40 }),
      ],
      "balanced",
    );
    expect(d.chosen!.slug).toBe("middle");
  });

  it("balanced penalises a poor success rate", () => {
    const d = rankCandidates(
      [
        c({ slug: "flaky", priceWei: "1000", p50LatencyMs: 100, successRate: 0.2 }),
        c({ slug: "solid", priceWei: "1000", p50LatencyMs: 100, successRate: 1 }),
      ],
      "balanced",
    );
    expect(d.chosen!.slug).toBe("solid");
  });

  it("surfaces the unmeasured caveat in the rationale", () => {
    const d = rankCandidates(
      [c({ slug: "known", p50LatencyMs: 100 }), c({ slug: "unknown", samples: 0 })],
      "balanced",
    );
    expect(d.rationale).toContain("no recorded calls");
  });

  it("ranks every candidate and explains each one", () => {
    const d = rankCandidates(
      [
        c({ slug: "a", priceWei: "10" }),
        c({ slug: "b", priceWei: "20" }),
        c({ slug: "c", priceWei: "30" }),
      ],
      "cheapest",
    );
    expect(d.ranked).toHaveLength(3);
    expect(d.ranked.map((r) => r.slug)).toEqual(["a", "b", "c"]);
    for (const r of d.ranked) expect(r.reason.length).toBeGreaterThan(0);
  });

  it("is stable when prices tie", () => {
    const d = rankCandidates(
      [c({ slug: "x", priceWei: "500" }), c({ slug: "y", priceWei: "500" })],
      "cheapest",
    );
    expect(d.ranked).toHaveLength(2);
    expect(d.chosen!.score).toBe(0);
  });
});
