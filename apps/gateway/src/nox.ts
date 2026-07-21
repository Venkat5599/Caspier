// Gateway routes for confidential settlement on iExec Nox.
//
// The gateway acts as the single relayer for the vault: agents never submit
// their own settlements, so on-chain every transaction shares one sender and
// per-agent activity is not distinguishable. See KairosAgentVault docs.
import type { Hono } from "hono";
import {
  NoxVaultClient,
  isNoxConfigured,
  loadNoxConfig,
  type NoxConfig,
} from "@fabric/nox-chain";

let cached: NoxVaultClient | null = null;
let cachedError: string | null = null;

/** Lazily build the vault client. Null when Nox is not configured. */
export async function getVault(config: NoxConfig = loadNoxConfig()): Promise<NoxVaultClient | null> {
  if (cached) return cached;
  if (!isNoxConfigured(config)) return null;
  try {
    cached = await NoxVaultClient.create(config);
    cachedError = null;
    return cached;
  } catch (err) {
    cachedError = (err as Error).message;
    return null;
  }
}

function toWei(value: unknown, field: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return BigInt(value.trim());
  throw new Error(`${field} must be a non-negative integer amount in wei`);
}

export function mountNoxRoutes(app: Hono): void {
  const config = loadNoxConfig();

  app.get("/nox/status", async (c) => {
    const vault = await getVault(config);
    if (!vault) {
      return c.json({
        configured: false,
        reason: cachedError ?? "VAULT_CONTRACT_ADDRESS or CHAIN_WORKER_SECRET_KEY not set",
        network: config.chainId,
      });
    }
    const [epoch, relayer] = await Promise.all([vault.epochStatus(), vault.signerAddress()]);
    return c.json({
      configured: true,
      vaultAddress: vault.vaultAddress,
      relayer,
      network: config.chainId,
      explorer: `https://sepolia.etherscan.io/address/${vault.vaultAddress}`,
      epoch: Number(epoch.epoch),
      epochCount: Number(epoch.count),
    });
  });

  /** Owner view: decrypted budget + current epoch total. */
  app.get("/nox/budget", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    try {
      const [budgetWei, epochTotalWei, epoch] = await Promise.all([
        vault.readBudget(),
        vault.readEpochTotal(),
        vault.epochStatus(),
      ]);
      return c.json({
        budgetWei: budgetWei.toString(),
        epochTotalWei: epochTotalWei.toString(),
        epoch: Number(epoch.epoch),
        epochCount: Number(epoch.count),
      });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 502);
    }
  });

  app.post("/nox/fund", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    try {
      const body = (await c.req.json()) as { amountWei?: unknown };
      const amount = toWei(body.amountWei, "amountWei");
      const tx = await vault.fund(amount);
      return c.json({ ok: true, ...tx }, 201);
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message }, 400);
    }
  });

  app.post("/nox/agents", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    try {
      const body = (await c.req.json()) as { agent?: string; capWei?: unknown };
      if (!body.agent?.startsWith("0x")) throw new Error("agent must be a 0x address");
      const cap = toWei(body.capWei, "capWei");
      const tx = await vault.registerAgent(body.agent, cap);
      return c.json({ ok: true, agent: body.agent, ...tx }, 201);
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message }, 400);
    }
  });

  app.get("/nox/agents/:agent", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    const agent = c.req.param("agent");
    try {
      const active = await vault.isActive(agent);
      if (!active) return c.json({ agent, active: false });
      const [capWei, spentWei] = await Promise.all([vault.readCap(agent), vault.readSpent(agent)]);
      return c.json({
        agent,
        active: true,
        capWei: capWei.toString(),
        spentWei: spentWei.toString(),
      });
    } catch (err) {
      return c.json({ agent, active: true, error: (err as Error).message }, 502);
    }
  });

  app.delete("/nox/agents/:agent", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    try {
      const tx = await vault.revokeAgent(c.req.param("agent"));
      return c.json({ ok: true, ...tx });
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message }, 400);
    }
  });

  /**
   * Settle with an encrypted amount. Fails closed: if the vault reports the
   * settlement was not authorized, the caller is told so and the paid action
   * must not proceed.
   */
  app.post("/nox/settle", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    try {
      const body = (await c.req.json()) as { recipient?: string; amountWei?: unknown };
      if (!body.recipient?.startsWith("0x")) throw new Error("recipient must be a 0x address");
      const amount = toWei(body.amountWei, "amountWei");
      const result = await vault.settle(body.recipient, amount);
      return c.json(
        {
          ok: result.authorized,
          authorized: result.authorized,
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
          blockNumber: result.blockNumber,
          spentWei: result.spentWei.toString(),
        },
        result.authorized ? 200 : 402,
      );
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message }, 400);
    }
  });

  app.get("/nox/epoch", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    const status = await vault.epochStatus();
    return c.json({ epoch: Number(status.epoch), count: Number(status.count) });
  });

  app.post("/nox/epoch/flush", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    try {
      const tx = await vault.flushEpoch();
      const status = await vault.epochStatus();
      return c.json({ ok: true, ...tx, epoch: Number(status.epoch) });
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message }, 400);
    }
  });
}
