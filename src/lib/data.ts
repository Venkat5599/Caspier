// Ray Dalio All-Weather canonical allocation, mapped to tokenized RWAs on Casper.
export type Asset = {
  ticker: string;
  name: string;
  weight: number; // percent
  accent: "emerald" | "amber" | "sky" | "violet" | "rose";
};

export const ALLWEATHER: Asset[] = [
  { ticker: "wTLT", name: "Long-Term Treasuries", weight: 40, accent: "emerald" },
  { ticker: "wSPX", name: "Equities (S&P basket)", weight: 30, accent: "sky" },
  { ticker: "wIEF", name: "Intermediate Treasuries", weight: 15, accent: "violet" },
  { ticker: "wGLD", name: "Gold", weight: 7.5, accent: "amber" },
  { ticker: "wDBC", name: "Commodities", weight: 7.5, accent: "rose" },
];

export const STATS = [
  { value: "9.8%", label: "avg annual return", sub: "100-yr backtest, All-Weather" },
  { value: "−18%", label: "max drawdown in 2008", sub: "vs −56% S&P 500" },
  { value: "24/7", label: "autonomous rebalancing", sub: "agent never sleeps" },
];

export const PARTNERS = [
  "Casper Network",
  "x402 Facilitator",
  "CSPR.cloud",
  "Odra Framework",
  "Model Context Protocol",
  "CSPR.click",
];

// Indexed growth of $100k, 2000–2025 (illustrative backtest shape).
export const PERF = {
  years: [2000, 2003, 2006, 2008, 2011, 2014, 2017, 2020, 2022, 2025],
  allWeather: [100, 118, 142, 134, 168, 205, 244, 268, 281, 352],
  spx: [100, 78, 112, 70, 118, 176, 224, 178, 232, 318],
};

// Crisis annotations on the chart.
export const CRISES = [
  { year: 2008, label: "2008 Crisis", aw: "−18%", spx: "−56%" },
  { year: 2020, label: "2020 Pandemic", aw: "−7%", spx: "−34%" },
];

const ACCENT_HEX: Record<Asset["accent"], string> = {
  emerald: "#34d399",
  amber: "#fbbf24",
  sky: "#38bdf8",
  violet: "#a78bfa",
  rose: "#fb7185",
};
export const hex = (a: Asset["accent"]) => ACCENT_HEX[a];

// Generate a plausible Casper Testnet deploy hash + explorer link.
export function fakeDeployHash(): string {
  const c = "0123456789abcdef";
  let h = "";
  for (let i = 0; i < 64; i++) h += c[Math.floor(Math.random() * 16)];
  return h;
}
export const explorer = (h: string) => `https://testnet.cspr.live/deploy/${h}`;
