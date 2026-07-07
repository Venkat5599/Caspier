import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type AgentScope = {
  label: string;
  sessionKeyId?: string;
  agentPublicKeyHex?: string;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYFILE = join(HERE, "..", "..", "..", "agent_keys.json");

let _map: Record<string, AgentScope> | null = null;

function keyMap(): Record<string, AgentScope> {
  if (_map) return _map;
  _map = {};
  try {
    if (process.env.FABRIC_AGENT_KEYS) _map = JSON.parse(process.env.FABRIC_AGENT_KEYS);
    else if (existsSync(KEYFILE)) _map = JSON.parse(readFileSync(KEYFILE, "utf8"));
  } catch (e) {
    console.error(`auth: could not parse agent key map — ${(e as Error).message}`);
  }
  return _map!;
}

function defaultScope(): AgentScope {
  return { label: process.env.FABRIC_ALLOW_ANON_SETTLE === "1" ? "default-dev" : "anonymous" };
}

export function resolveScope(bearer?: string): AgentScope {
  if (!bearer) return defaultScope();
  const token = bearer.replace(/^Bearer\s+/i, "").trim();
  return keyMap()[token] ?? defaultScope();
}

const als = new AsyncLocalStorage<AgentScope>();

export function withScope<T>(scope: AgentScope, fn: () => Promise<T>): Promise<T> {
  return als.run(scope, fn);
}

export function currentScope(): AgentScope {
  return als.getStore() ?? defaultScope();
}
