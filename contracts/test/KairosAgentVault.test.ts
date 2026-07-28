// KairosAgentVault — Safe module integration and access control.
//
// Scope note, stated plainly: these tests cover every path that does NOT
// require an encrypted input — ownership, the Safe module surface, epoch
// batching mechanics and the revert guards. That is deliberately the whole
// surface Kairos adds *around* Safe, which is the part a reviewer needs to
// trust and the part that was previously untested.
//
// The encrypted settlement path (cap comparison, budget debit, authorization
// flag) needs a live Nox TEE to compute handles, so it is exercised against
// real Ethereum Sepolia by `scripts/nox-demo.ts` rather than simulated here.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, zeroAddress } from "viem";

// Attach to the node the Nox plugin starts and etches NoxCompute into. A bare
// `network.connect()` would create a second, unrelated chain with no
// NoxCompute, and the vault constructor would revert inside `Nox.toEuint256`.
const { viem } = await network.connect({ network: "noxLocal" });

const DEAD = getAddress("0x000000000000000000000000000000000000dEaD");
const EMPTY_HANDLE = `0x${"00".repeat(32)}` as `0x${string}`;

/** Deploy a fresh MockSafe + vault pair so no test inherits another's state. */
async function deployWithSafe() {
  const publicClient = await viem.getPublicClient();
  const [owner, other] = await viem.getWalletClients();
  const safe = await viem.deployContract("MockSafe");
  const vault = await viem.deployContract("KairosAgentVault", [safe.address]);
  return { publicClient, owner, other, safe, vault };
}

async function deployStandalone() {
  const publicClient = await viem.getPublicClient();
  const [owner, other] = await viem.getWalletClients();
  const vault = await viem.deployContract("KairosAgentVault", [zeroAddress]);
  return { publicClient, owner, other, vault };
}

/** hardhat-viem writes return a hash; wait so state is settled before asserting. */
async function send(
  publicClient: Awaited<ReturnType<typeof viem.getPublicClient>>,
  hash: `0x${string}`,
) {
  return publicClient.waitForTransactionReceipt({ hash });
}

async function expectRevert(action: Promise<unknown>, reason: string) {
  try {
    await action;
    assert.fail(`expected revert "${reason}", but the call succeeded`);
  } catch (err) {
    const message = String((err as Error)?.message ?? err);
    assert.ok(
      message.includes(reason),
      `expected revert "${reason}", got: ${message}`,
    );
  }
}

describe("KairosAgentVault — deployment", () => {
  it("records the deployer as owner", async () => {
    const { vault, owner } = await deployWithSafe();
    assert.equal(
      getAddress(await vault.read.owner()),
      getAddress(owner.account.address),
    );
  });

  it("stores the Safe it was constructed with", async () => {
    const { vault, safe } = await deployWithSafe();
    assert.equal(getAddress(await vault.read.safe()), getAddress(safe.address));
  });

  it("supports standalone mode with no Safe attached", async () => {
    const { vault } = await deployStandalone();
    assert.equal(getAddress(await vault.read.safe()), zeroAddress);
    assert.equal(await vault.read.isInstalledOnSafe(), false);
  });

  it("starts at epoch zero with no settlements batched", async () => {
    const { vault } = await deployWithSafe();
    assert.equal(await vault.read.epoch(), 0n);
    assert.equal(await vault.read.epochCount(), 0n);
  });
});

describe("KairosAgentVault — Safe module installation", () => {
  it("reports installed when the Safe has the module enabled", async () => {
    const { vault } = await deployWithSafe();
    assert.equal(await vault.read.isInstalledOnSafe(), true);
  });

  it("reports not installed when the Safe has not enabled the module", async () => {
    const { publicClient, safe, vault } = await deployWithSafe();
    await send(publicClient, await safe.write.setModuleEnabled([false]));
    assert.equal(await vault.read.isInstalledOnSafe(), false);
  });

  it("lets the owner repoint the vault at a different Safe", async () => {
    const { publicClient, vault } = await deployWithSafe();
    const next = await viem.deployContract("MockSafe");
    await send(publicClient, await vault.write.setSafe([next.address]));
    assert.equal(getAddress(await vault.read.safe()), getAddress(next.address));
  });

  it("emits SafeUpdated when the Safe changes", async () => {
    const { publicClient, vault } = await deployWithSafe();
    const next = await viem.deployContract("MockSafe");
    await send(publicClient, await vault.write.setSafe([next.address]));

    const events = await publicClient.getContractEvents({
      address: vault.address,
      abi: vault.abi,
      eventName: "SafeUpdated",
      fromBlock: 0n,
    });
    assert.equal(events.length, 1);
    assert.equal(
      getAddress(events[0]!.args.safe as string),
      getAddress(next.address),
    );
  });

  it("rejects setSafe from a non-owner", async () => {
    const { vault, other } = await deployWithSafe();
    await expectRevert(
      vault.write.setSafe([DEAD], { account: other.account }),
      "not owner",
    );
  });
});

describe("KairosAgentVault — epoch batching", () => {
  it("advances the epoch and resets the count on flush", async () => {
    const { publicClient, vault } = await deployWithSafe();
    await send(publicClient, await vault.write.flushEpoch());
    assert.equal(await vault.read.epoch(), 1n);
    assert.equal(await vault.read.epochCount(), 0n);
  });

  it("emits EpochSettled naming the closed epoch and its count", async () => {
    const { publicClient, vault } = await deployWithSafe();
    await send(publicClient, await vault.write.flushEpoch());

    const events = await publicClient.getContractEvents({
      address: vault.address,
      abi: vault.abi,
      eventName: "EpochSettled",
      fromBlock: 0n,
    });
    assert.equal(events.length, 1);
    assert.equal(events[0]!.args.epoch, 0n);
    // No settlements were made, so the batch closed empty.
    assert.equal(events[0]!.args.count, 0n);
  });

  it("rejects flushEpoch from a non-owner", async () => {
    const { vault, other } = await deployWithSafe();
    await expectRevert(
      vault.write.flushEpoch({ account: other.account }),
      "not owner",
    );
  });
});

describe("KairosAgentVault — executeBatch through the Safe", () => {
  it("forwards a plain value transfer to execTransactionFromModule", async () => {
    const { publicClient, vault, safe } = await deployWithSafe();
    await send(publicClient, await vault.write.flushEpoch());
    await send(publicClient, await vault.write.executeBatch([0n, DEAD, 4_200n]));

    assert.equal(await safe.read.callCount(), 1n);
    assert.equal(getAddress(await safe.read.lastTo()), DEAD);
    assert.equal(await safe.read.lastValue(), 4_200n);
    // Empty calldata and operation 0 — a CALL, never a DELEGATECALL into Safe.
    assert.equal(await safe.read.lastData(), "0x");
    assert.equal(await safe.read.lastOperation(), 0);
  });

  it("emits BatchExecuted with the epoch, recipient and aggregate", async () => {
    const { publicClient, vault } = await deployWithSafe();
    await send(publicClient, await vault.write.flushEpoch());
    await send(publicClient, await vault.write.executeBatch([0n, DEAD, 4_200n]));

    const events = await publicClient.getContractEvents({
      address: vault.address,
      abi: vault.abi,
      eventName: "BatchExecuted",
      fromBlock: 0n,
    });
    assert.equal(events.length, 1);
    assert.equal(events[0]!.args.epoch, 0n);
    assert.equal(getAddress(events[0]!.args.to as string), DEAD);
    assert.equal(events[0]!.args.amount, 4_200n);
  });

  it("refuses to execute an epoch that is still open", async () => {
    const { vault } = await deployWithSafe();
    await expectRevert(
      vault.write.executeBatch([0n, DEAD, 1n]),
      "epoch still open",
    );
  });

  it("refuses to execute with no Safe configured", async () => {
    const { publicClient, vault } = await deployStandalone();
    await send(publicClient, await vault.write.flushEpoch());
    await expectRevert(
      vault.write.executeBatch([0n, DEAD, 1n]),
      "no safe configured",
    );
  });

  it("refuses the zero address as a recipient", async () => {
    const { publicClient, vault } = await deployWithSafe();
    await send(publicClient, await vault.write.flushEpoch());
    await expectRevert(
      vault.write.executeBatch([0n, zeroAddress, 1n]),
      "bad recipient",
    );
  });

  it("surfaces a Safe that rejects the module call", async () => {
    const { publicClient, vault, safe } = await deployWithSafe();
    await send(publicClient, await vault.write.flushEpoch());
    await send(publicClient, await safe.write.setShouldSucceed([false]));
    await expectRevert(
      vault.write.executeBatch([0n, DEAD, 1n]),
      "safe module call failed",
    );
  });

  it("rejects executeBatch from a non-owner", async () => {
    const { publicClient, vault, other } = await deployWithSafe();
    await send(publicClient, await vault.write.flushEpoch());
    await expectRevert(
      vault.write.executeBatch([0n, DEAD, 1n], { account: other.account }),
      "not owner",
    );
  });
});

describe("KairosAgentVault — agent sessions", () => {
  it("treats an unknown address as having no session", async () => {
    const { vault } = await deployWithSafe();
    assert.equal(await vault.read.isActive([DEAD]), false);
  });

  it("refuses a settlement from an agent with no session", async () => {
    const { vault, other } = await deployWithSafe();
    // Reverts on the session check before any encrypted input is read, so this
    // path is verifiable without a live TEE.
    await expectRevert(
      vault.write.settle([DEAD, EMPTY_HANDLE, "0x"], { account: other.account }),
      "no session",
    );
  });

  it("rejects revokeAgent from a non-owner", async () => {
    const { vault, other } = await deployWithSafe();
    await expectRevert(
      vault.write.revokeAgent([DEAD], { account: other.account }),
      "not owner",
    );
  });

  it("emits AgentRevoked and leaves the agent inactive", async () => {
    const { publicClient, vault } = await deployWithSafe();
    await send(publicClient, await vault.write.revokeAgent([DEAD]));

    const events = await publicClient.getContractEvents({
      address: vault.address,
      abi: vault.abi,
      eventName: "AgentRevoked",
      fromBlock: 0n,
    });
    assert.equal(events.length, 1);
    assert.equal(getAddress(events[0]!.args.agent as string), DEAD);
    assert.equal(await vault.read.isActive([DEAD]), false);
  });

  it("rejects fund from a non-owner", async () => {
    const { vault, other } = await deployWithSafe();
    await expectRevert(
      vault.write.fund([EMPTY_HANDLE, "0x"], { account: other.account }),
      "not owner",
    );
  });

  it("rejects registerAgent from a non-owner", async () => {
    const { vault, other } = await deployWithSafe();
    await expectRevert(
      vault.write.registerAgent([DEAD, EMPTY_HANDLE, "0x"], {
        account: other.account,
      }),
      "not owner",
    );
  });
});
