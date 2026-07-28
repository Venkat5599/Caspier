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

  // --- Safe module ---------------------------------------------------------
  // Kairos is installed on an existing Safe with `enableModule`. Safe itself is
  // never forked, modified, or migrated — these routes only report and exercise
  // the module relationship.

  /** Which Safe the vault spends from, and whether it has enabled the module. */
  app.get("/nox/safe", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    try {
      const safe = await vault.safeAddress();
      const standalone = /^0x0{40}$/i.test(safe);
      // A Safe that has not run `enableModule` cannot be spent from, so report
      // installation separately from configuration.
      const installed = standalone ? false : await vault.isInstalledOnSafe();
      return c.json({
        safe: standalone ? null : safe,
        standalone,
        installed,
        explorer: standalone ? null : `https://sepolia.etherscan.io/address/${safe}`,
      });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 502);
    }
  });

  /** Owner: attach the vault to a Safe. */
  app.post("/nox/safe", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    try {
      const body = (await c.req.json()) as { safe?: string };
      if (!body.safe?.startsWith("0x")) throw new Error("safe must be a 0x address");
      const tx = await vault.setSafe(body.safe);
      return c.json({ ok: true, safe: body.safe, ...tx }, 201);
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

  /**
   * Aggregate for a closed epoch, decrypted from the handle `flushEpoch`
   * released for public decryption. This is the one number the batch reveals:
   * it covers every settlement in the epoch and cannot be decomposed into the
   * individual payments that produced it.
   */
  app.get("/nox/epoch/:epoch", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    const raw = c.req.param("epoch");
    if (!/^\d+$/.test(raw)) return c.json({ error: "epoch must be an integer" }, 400);
    const closedEpoch = BigInt(raw);
    try {
      const status = await vault.epochStatus();
      if (closedEpoch >= status.epoch) {
        return c.json({ epoch: Number(closedEpoch), closed: false }, 409);
      }
      const { totalWei, count } = await vault.readClosedEpoch(closedEpoch);
      return c.json({
        epoch: Number(closedEpoch),
        closed: true,
        totalWei: totalWei.toString(),
        count: Number(count),
      });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 502);
    }
  });

  /**
   * Owner: move a closed epoch's aggregate out of the Safe in one transfer, via
   * `execTransactionFromModule`. Many private settlements leave as a single
   * public movement, so on-chain timing cannot be mapped back to API calls.
   */
  app.post("/nox/epoch/:epoch/execute", async (c) => {
    const vault = await getVault(config);
    if (!vault) return c.json({ error: "nox not configured" }, 503);
    const raw = c.req.param("epoch");
    if (!/^\d+$/.test(raw)) return c.json({ error: "epoch must be an integer" }, 400);
    try {
      const body = (await c.req.json()) as { to?: string; amountWei?: unknown };
      if (!body.to?.startsWith("0x")) throw new Error("to must be a 0x address");
      const amount = toWei(body.amountWei, "amountWei");
      const tx = await vault.executeBatch(BigInt(raw), body.to, amount);
      return c.json({ ok: true, epoch: Number(raw), to: body.to, ...tx }, 201);
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message }, 400);
    }
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
