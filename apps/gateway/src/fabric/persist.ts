// Durable snapshot for the fabric store.
//
// The store is held in memory so the route handlers stay synchronous, but a
// gateway restart used to wipe every published API, workflow and MCP server.
// This writes a debounced JSON snapshot after each mutation and reloads it on
// boot, so state survives restarts and redeploys without requiring Postgres.
//
// Set DATABASE_URL and use the catalog's PgCatalogStore when you want a real
// database; this keeps a single-node deployment honest in the meantime.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const STATE_FILE =
  process.env.FABRIC_STATE_FILE ?? join(process.cwd(), ".data", "fabric-state.json");

const SAVE_DEBOUNCE_MS = Number(process.env.FABRIC_STATE_DEBOUNCE_MS ?? 250);

export interface FabricSnapshot {
  version: 1;
  savedAt: string;
  apis: unknown[];
  workflows: unknown[];
  mcpServers: unknown[];
  logs: unknown[];
  /** Optional so snapshots written before run history remain loadable. */
  runs?: unknown[];
}

/** Read the snapshot written by a previous process. Null when absent or unusable. */
export function loadSnapshot(): FabricSnapshot | null {
  try {
    const raw = readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as FabricSnapshot;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    // A missing file on first boot is the normal case, and a corrupt file
    // should not take the gateway down: start empty and let the next save
    // overwrite it.
    return null;
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: (() => FabricSnapshot) | null = null;

function writeNow(snapshot: FabricSnapshot): void {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    // Write to a temp file and rename, so a crash mid-write cannot leave a
    // truncated snapshot behind.
    const tmp = `${STATE_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(snapshot), "utf8");
    renameSync(tmp, STATE_FILE);
  } catch (err) {
    console.error(`fabric: could not persist state — ${(err as Error).message}`);
  }
}

/**
 * Schedule a snapshot write. Debounced so a burst of mutations — seeding the
 * marketplace, for instance — produces one write rather than dozens.
 */
export function scheduleSave(build: () => FabricSnapshot): void {
  pending = build;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const next = pending;
    pending = null;
    if (next) writeNow(next());
  }, SAVE_DEBOUNCE_MS);
}

/** Flush any pending write immediately. Used on shutdown and in tests. */
export function flushSave(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const next = pending;
  pending = null;
  if (next) writeNow(next());
}

export const stateFilePath = STATE_FILE;
