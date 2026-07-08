// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title KairosAgentVault
/// @notice Confidential agent payment vault for the iExec Nox WTF hackathon.
/// @dev Owner funds an encrypted budget. Each agent has an encrypted per-call cap.
///      Settlements debit the budget with encrypted amounts — amounts stay private via Nox.
import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

contract KairosAgentVault {
    address public owner;
    euint256 public budget;

    struct AgentSession {
        bool active;
        euint256 capPerCall;
    }

    mapping(address => AgentSession) public sessions;

    event BudgetFunded(address indexed owner);
    event AgentRegistered(address indexed agent);
    event PrivateSettlement(address indexed agent, address indexed recipient);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        budget = Nox.toEuint256(0);
        Nox.allowThis(budget);
        Nox.allow(budget, owner);
    }

    /// Fund the confidential agent budget (owner).
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
        externalEuint256 capHandle,
        bytes calldata capProof
    ) external onlyOwner {
        euint256 cap = Nox.fromExternal(capHandle, capProof);
        sessions[agent] = AgentSession({active: true, capPerCall: cap});
        Nox.allowThis(cap);
        Nox.allow(cap, owner);
        Nox.allow(cap, agent);
        emit AgentRegistered(agent);
    }

    /// Agent settles a private payment: debits encrypted budget by encrypted amount.
    /// Cap enforcement uses Nox comparison on encrypted values (TEE off-chain).
    function settle(
        address recipient,
        externalEuint256 amountHandle,
        bytes calldata amountProof
    ) external {
        AgentSession storage s = sessions[msg.sender];
        require(s.active, "no session");

        euint256 amount = Nox.fromExternal(amountHandle, amountProof);

        // cap >= amount (encrypted compare → ebool, select keeps privacy)
        ebool withinCap = Nox.le(amount, s.capPerCall);
        euint256 debit = Nox.select(withinCap, amount, Nox.toEuint256(0));
        budget = Nox.sub(budget, debit);

        Nox.allowThis(budget);
        Nox.allow(budget, owner);
        Nox.allow(budget, msg.sender);

        emit PrivateSettlement(msg.sender, recipient);
    }

    function revokeAgent(address agent) external onlyOwner {
        sessions[agent].active = false;
    }
}
