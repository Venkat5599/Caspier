// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ebool, euint256, externalEuint256} from "encrypted-types/EncryptedTypes.sol";

/// @notice The single Safe entrypoint this vault uses. Kairos is installed as a
///         Safe Module via `enableModule`; Safe itself is not modified, not
///         forked, and needs no migration of funds.
interface ISafe {
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external returns (bool success);

    function isModuleEnabled(address module) external view returns (bool);
}

/// @title KairosAgentVault
/// @notice Confidential agent spending vault built on iExec Nox.
///
/// @dev Privacy model — what an on-chain observer can and cannot see.
///
///      Hidden (encrypted handles, decryptable only by permitted accounts):
///        - the treasury budget and its remaining balance
///        - each agent's per-call spending cap
///        - each agent's cumulative spend
///        - the amount of any individual settlement
///        - whether a given settlement was authorized or rejected
///
///      Public:
///        - that the vault exists and has an owner
///        - that some settlement occurred within an epoch, and how many
///        - the relayer address that submitted the transaction
///
///      Counterparty privacy comes from two choices. First, settlements emit
///      no addresses: `PrivateSettlement` carries only an epoch number, so
///      logs cannot be used to build a payment graph. Second, payouts are
///      batched — individual debits accumulate into an encrypted epoch total
///      that the owner flushes as one aggregate movement, breaking the
///      one-transaction-per-API-call linkage that would otherwise leak usage
///      patterns through timing alone.
///
///      Known limitation: `msg.sender` is inherently public, so an agent that
///      submits its own settlement is identifiable. Kairos routes settlements
///      through a single gateway relayer, so on-chain every settlement shares
///      one sender and per-agent activity is not distinguishable.
///
/// @dev Encrypted control flow — an `ebool` cannot gate a `require`, since
///      reverting would leak the comparison result. Authorization is enforced
///      with `Nox.select` (debit the amount, or debit zero) and the outcome is
///      published as an encrypted flag that only the owner and the calling
///      agent may decrypt. The off-chain gateway fails closed on that flag.
contract KairosAgentVault {
    address public owner;

    /// The Safe this vault spends from, or address(0) for standalone mode.
    /// Kairos never modifies Safe: it is installed with `enableModule` and
    /// moves funds only through `execTransactionFromModule`.
    address public safe;

    /// Encrypted remaining treasury budget.
    euint256 private budget;

    /// Encrypted sum of authorized debits in the current epoch.
    euint256 private epochTotal;

    /// Current batching epoch. Incremented on flush.
    uint256 public epoch;

    /// Number of settlement attempts recorded in the current epoch.
    uint256 public epochCount;

    /// Encrypted total for each closed epoch, released for public decryption
    /// by `flushEpoch` so the aggregate can be verified against `executeBatch`.
    mapping(uint256 => euint256) private closedEpochTotal;

    struct AgentSession {
        bool active;
        /// Encrypted maximum spend allowed in a single settlement.
        euint256 capPerCall;
        /// Encrypted cumulative amount this agent has settled.
        euint256 spent;
    }

    mapping(address => AgentSession) private sessions;

    /// Encrypted result of an agent's most recent settlement attempt.
    mapping(address => ebool) private lastSettlementOk;

    event BudgetFunded(address indexed owner);
    event AgentRegistered(address indexed agent);
    event AgentRevoked(address indexed agent);

    /// Deliberately carries no addresses and no amount — only the epoch.
    event PrivateSettlement(uint256 indexed epoch);

    /// Aggregate flush. `count` is the number of settlements batched. The
    /// total is made publicly decryptable at this point — deliberately, and
    /// only in aggregate: the batch reveals one number covering `count`
    /// payments, never an individual amount, cap, or agent.
    event EpochSettled(uint256 indexed epoch, uint256 count);

    /// One aggregate movement out of the Safe for a closed epoch.
    event BatchExecuted(uint256 indexed epoch, address indexed to, uint256 amount);

    event SafeUpdated(address indexed safe);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    /// @param safe_ Safe to spend from, or address(0) to run standalone.
    constructor(address safe_) {
        owner = msg.sender;
        safe = safe_;
        budget = Nox.toEuint256(0);
        epochTotal = Nox.toEuint256(0);
        Nox.allowThis(budget);
        Nox.allow(budget, owner);
        Nox.allowThis(epochTotal);
        Nox.allow(epochTotal, owner);
    }

    /// Fund the confidential treasury budget with an encrypted amount.
    function fund(externalEuint256 inputHandle, bytes calldata inputProof) external onlyOwner {
        euint256 amount = Nox.fromExternal(inputHandle, inputProof);
        budget = Nox.add(budget, amount);
        Nox.allowThis(budget);
        Nox.allow(budget, owner);
        emit BudgetFunded(owner);
    }

    /// Register an agent with an encrypted per-call spending cap.
    function registerAgent(
        address agent,
        externalEuint256 capHandle_,
        bytes calldata capProof
    ) external onlyOwner {
        euint256 cap = Nox.fromExternal(capHandle_, capProof);
        euint256 zero = Nox.toEuint256(0);

        sessions[agent] = AgentSession({active: true, capPerCall: cap, spent: zero});

        Nox.allowThis(cap);
        Nox.allow(cap, owner);
        Nox.allow(cap, agent);

        Nox.allowThis(zero);
        Nox.allow(zero, owner);
        Nox.allow(zero, agent);

        emit AgentRegistered(agent);
    }

    /// Settle a private payment. The debit joins the current epoch's encrypted
    /// total rather than moving funds immediately, so no single transaction
    /// corresponds to a single API call.
    ///
    /// `recipient` is used only for the encrypted accounting context; it is
    /// never emitted.
    function settle(
        address recipient,
        externalEuint256 amountHandle,
        bytes calldata amountProof
    ) external {
        AgentSession storage s = sessions[msg.sender];
        require(s.active, "no session");
        require(recipient != address(0), "bad recipient");

        euint256 amount = Nox.fromExternal(amountHandle, amountProof);
        euint256 zero = Nox.toEuint256(0);

        // Gate 1: amount <= capPerCall
        ebool withinCap = Nox.le(amount, s.capPerCall);
        euint256 requested = Nox.select(withinCap, amount, zero);

        // Gate 2: budget >= requested. safeSub reports underflow as an
        // encrypted flag instead of reverting, which would leak the balance.
        (ebool funded, euint256 remaining) = Nox.safeSub(budget, requested);

        euint256 debited = Nox.select(funded, requested, zero);
        budget = Nox.select(funded, remaining, budget);
        s.spent = Nox.add(s.spent, debited);
        epochTotal = Nox.add(epochTotal, debited);

        ebool ok = Nox.gt(debited, zero);
        lastSettlementOk[msg.sender] = ok;

        Nox.allowThis(budget);
        Nox.allow(budget, owner);
        Nox.allowThis(epochTotal);
        Nox.allow(epochTotal, owner);

        Nox.allowThis(s.spent);
        Nox.allow(s.spent, owner);
        Nox.allow(s.spent, msg.sender);

        Nox.allowThis(ok);
        Nox.allow(ok, owner);
        Nox.allow(ok, msg.sender);

        epochCount += 1;
        emit PrivateSettlement(epoch);
    }

    /// Owner: close the current epoch.
    ///
    /// The encrypted epoch total is released for public decryption here. That
    /// is the batching trade deliberately taken: one aggregate number covering
    /// `count` payments becomes knowable, while every individual amount, cap,
    /// agent and authorization outcome stays encrypted. Payments inside a batch
    /// are indistinguishable from one another.
    function flushEpoch() external onlyOwner {
        uint256 closed = epoch;
        uint256 count = epochCount;

        Nox.allowPublicDecryption(epochTotal);
        closedEpochTotal[closed] = epochTotal;

        emit EpochSettled(closed, count);

        epoch = closed + 1;
        epochCount = 0;
        epochTotal = Nox.toEuint256(0);
        Nox.allowThis(epochTotal);
        Nox.allow(epochTotal, owner);
    }

    /// Owner: move a closed epoch's aggregate out of the Safe in one transfer.
    ///
    /// `amount` is the publicly decrypted total for `closedEpoch`, released by
    /// `flushEpoch`. Anyone can verify it against the handle in
    /// `closedEpochTotalHandle(closedEpoch)`; nobody can decompose it into the
    /// individual payments that produced it.
    ///
    /// Safe is called through its module interface only — no fork, no
    /// modification, no migration of funds.
    function executeBatch(uint256 closedEpoch, address to, uint256 amount) external onlyOwner {
        require(safe != address(0), "no safe configured");
        require(closedEpoch < epoch, "epoch still open");
        require(to != address(0), "bad recipient");

        bool ok = ISafe(safe).execTransactionFromModule(to, amount, "", 0);
        require(ok, "safe module call failed");

        emit BatchExecuted(closedEpoch, to, amount);
    }

    /// Owner: point the vault at a different Safe.
    function setSafe(address safe_) external onlyOwner {
        safe = safe_;
        emit SafeUpdated(safe_);
    }

    /// True when this vault is installed as a module on its Safe.
    function isInstalledOnSafe() external view returns (bool) {
        if (safe == address(0)) return false;
        return ISafe(safe).isModuleEnabled(address(this));
    }

    function revokeAgent(address agent) external onlyOwner {
        sessions[agent].active = false;
        emit AgentRevoked(agent);
    }

    // --- Encrypted views (handles; decryptable only by permitted accounts) ---

    /// Encrypted remaining budget. Decryptable by the owner only.
    function budgetHandle() external view returns (euint256) {
        return budget;
    }

    /// Encrypted total debited in the current epoch. Owner only.
    function epochTotalHandle() external view returns (euint256) {
        return epochTotal;
    }

    /// Encrypted total for a closed epoch. Publicly decryptable after flush,
    /// so anyone can check `executeBatch`'s amount against it.
    function closedEpochTotalHandle(uint256 closedEpoch) external view returns (euint256) {
        return closedEpochTotal[closedEpoch];
    }

    /// Encrypted cumulative spend for an agent. Owner and that agent only.
    function spentHandle(address agent) external view returns (euint256) {
        return sessions[agent].spent;
    }

    /// Encrypted per-call cap for an agent. Owner and that agent only.
    function capHandle(address agent) external view returns (euint256) {
        return sessions[agent].capPerCall;
    }

    /// Encrypted outcome of an agent's last settlement. Owner and that agent only.
    function lastSettlementOkHandle(address agent) external view returns (ebool) {
        return lastSettlementOk[agent];
    }

    function isActive(address agent) external view returns (bool) {
        return sessions[agent].active;
    }
}
