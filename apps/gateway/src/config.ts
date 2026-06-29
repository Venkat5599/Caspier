/** Gateway runtime configuration, loaded from the environment with safe defaults. */
export interface GatewayConfig {
  port: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function loadConfig(): GatewayConfig {
  const level = (process.env.LOG_LEVEL ?? "info") as GatewayConfig["logLevel"];
  return {
    port: intEnv("GATEWAY_PORT", 8080),
    logLevel: level,
  };
}
