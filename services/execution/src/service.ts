import type { CatalogUnit } from "@fabric/catalog";

export interface SandboxContext {
  http: {
    get(url: string): Promise<unknown>;
  };
}

export interface ExecutionResult {
  output: unknown;
  runtimeMs: number;
  sandbox: "isolated-fetch" | "builtin";
}

const DEFAULT_WALL_MS = Number(process.env.SANDBOX_MAX_WALL_MS ?? 30_000);

function allowedHost(url: string, allowlist: string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowlist.some((h) => host === h.toLowerCase() || host.endsWith(`.${h.toLowerCase()}`));
  } catch {
    return false;
  }
}

function makeCtx(allowlist: string[]): SandboxContext {
  return {
    http: {
      async get(url: string) {
        if (!allowedHost(url, allowlist)) {
          throw new Error(`egress denied: ${url}`);
        }
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return res.json();
      },
    },
  };
}

async function runHelloWeather(input: { city?: string }, ctx: SandboxContext) {
  const city = (input.city ?? "Oslo").trim();
  const geo = (await ctx.http.get(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
  )) as { results?: { latitude: number; longitude: number; name: string }[] };
  const hit = geo.results?.[0];
  if (!hit) return { summary: `${city}: location not found.` };

  const wx = (await ctx.http.get(
    `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,weather_code&timezone=auto`,
  )) as { current?: { temperature_2m: number; weather_code: number } };

  const temp = wx.current?.temperature_2m ?? "?";
  const code = wx.current?.weather_code ?? 0;
  const conditions =
    code === 0 ? "clear" : code <= 3 ? "partly cloudy" : code <= 48 ? "foggy" : "variable";
  return { summary: `${hit.name} is ${temp}°C, ${conditions}.` };
}

const HANDLERS: Record<string, (input: unknown, ctx: SandboxContext) => Promise<unknown>> = {
  "hello-weather": (input, ctx) => runHelloWeather(input as { city?: string }, ctx),
};

/** Sandboxed skill execution with egress allowlist enforcement. */
export class ExecutionService {
  async run(unit: CatalogUnit, input: unknown): Promise<ExecutionResult> {
    const start = Date.now();
    const allowlist = unit.manifest.scope.egress;
    const ctx = makeCtx(allowlist);

    const handler = HANDLERS[unit.slug];
    if (!handler) {
      throw new Error(`no runtime handler for slug: ${unit.slug}`);
    }

    const output = await Promise.race([
      handler(input, ctx),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("sandbox wall timeout")), DEFAULT_WALL_MS),
      ),
    ]);

    return {
      output,
      runtimeMs: Date.now() - start,
      sandbox: "builtin",
    };
  }
}
