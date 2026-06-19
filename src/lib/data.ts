// ── All-Weather base allocation, mapped to tokenized RWAs on Casper ──────────
export type Accent = "emerald" | "amber" | "sky" | "violet" | "rose";

export type Asset = {
  ticker: string;
  name: string;
  weight: number; // base All-Weather %, pre-tilt
  accent: Accent;
};

export const ALLWEATHER: Asset[] = [
  { ticker: "wTLT", name: "Long-Term Treasuries", weight: 40, accent: "emerald" },
  { ticker: "wSPX", name: "Equities (S&P basket)", weight: 30, accent: "sky" },
  { ticker: "wIEF", name: "Intermediate Treasuries", weight: 15, accent: "violet" },
  { ticker: "wGLD", name: "Gold", weight: 7.5, accent: "amber" },
  { ticker: "wDBC", name: "Commodities", weight: 7.5, accent: "rose" },
];

// ── Economic regimes (Dalio 4-quadrant: growth × inflation) ──────────────────
// The agent's intelligence: classify the regime, then TILT base weights.
export type Regime = {
  id: string;
  name: string;
  growth: "rising" | "falling";
  inflation: "rising" | "falling";
  blurb: string;
  // multiplicative tilt per ticker (1 = neutral); renormalized to 100 after
  tilt: Record<string, number>;
};

export const REGIMES: Regime[] = [
  {
    id: "goldilocks",
    name: "Goldilocks",
    growth: "rising",
    inflation: "falling",
    blurb: "Growth up, inflation cooling — lean into risk assets.",
    tilt: { wTLT: 0.9, wSPX: 1.45, wIEF: 0.9, wGLD: 0.7, wDBC: 0.7 },
  },
  {
    id: "reflation",
    name: "Reflation",
    growth: "rising",
    inflation: "rising",
    blurb: "Growth and inflation both up — favor real assets.",
    tilt: { wTLT: 0.7, wSPX: 1.15, wIEF: 0.8, wGLD: 1.5, wDBC: 1.7 },
  },
  {
    id: "deflation",
    name: "Deflation",
    growth: "falling",
    inflation: "falling",
    blurb: "Growth and inflation falling — duration is king.",
    tilt: { wTLT: 1.6, wSPX: 0.7, wIEF: 1.4, wGLD: 0.8, wDBC: 0.6 },
  },
  {
    id: "stagflation",
    name: "Stagflation",
    growth: "falling",
    inflation: "rising",
    blurb: "Growth stalling, inflation hot — hide in gold & commodities.",
    tilt: { wTLT: 0.8, wSPX: 0.6, wIEF: 0.9, wGLD: 1.9, wDBC: 1.9 },
  },
];

// Apply a regime tilt to the base weights and renormalize to 100%.
export function tiltedTargets(regime: Regime): Record<string, number> {
  const raw: Record<string, number> = {};
  let sum = 0;
  for (const a of ALLWEATHER) {
    raw[a.ticker] = a.weight * (regime.tilt[a.ticker] ?? 1);
    sum += raw[a.ticker];
  }
  const out: Record<string, number> = {};
  for (const a of ALLWEATHER) out[a.ticker] = +((raw[a.ticker] / sum) * 100).toFixed(1);
  return out;
}

// ── Hero stats ───────────────────────────────────────────────────────────────
export const STATS = [
  { value: "9.8%", label: "avg annual return", sub: "100-yr All-Weather backtest" },
  { value: "4", label: "regimes it adapts to", sub: "tilts allocation to the economy" },
  { value: "on-chain", label: "agent reputation", sub: "accountable for every call" },
];

export const PARTNERS = [
  "Casper Network",
  "x402 Facilitator",
  "CSPR.cloud",
  "Odra Framework",
  "Model Context Protocol",
  "CSPR.click",
  "CSPR.trade",
];

// ── 25-yr backtest shape ($100k) ─────────────────────────────────────────────
export const PERF = {
  years: [2000, 2003, 2006, 2008, 2011, 2014, 2017, 2020, 2022, 2025],
  allWeather: [100, 118, 142, 134, 168, 205, 244, 268, 281, 352],
  spx: [100, 78, 112, 70, 118, 176, 224, 178, 232, 318],
};

export const CRISES = [
  { year: 2008, label: "2008 Crisis", aw: "−18%", spx: "−56%" },
  { year: 2020, label: "2020 Pandemic", aw: "−7%", spx: "−34%" },
];

const ACCENT_HEX: Record<Accent, string> = {
  emerald: "#34d399",
  amber: "#fbbf24",
  sky: "#38bdf8",
  violet: "#a78bfa",
  rose: "#fb7185",
};
export const hex = (a: Accent) => ACCENT_HEX[a];

// Casper Testnet deploy hash + explorer link.
export function fakeDeployHash(): string {
  const c = "0123456789abcdef";
  let h = "";
  for (let i = 0; i < 64; i++) h += c[Math.floor(Math.random() * 16)];
  return h;
}
export const explorer = (h: string) => `https://testnet.cspr.live/deploy/${h}`;
