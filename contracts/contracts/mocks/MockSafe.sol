// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

/// @notice Minimal stand-in for a Gnosis Safe, implementing only the two
///         functions Kairos actually uses as a module.
///
/// @dev Kairos never forks or modifies Safe — it is installed with
///      `enableModule` and moves funds through `execTransactionFromModule`.
///      This mock records the arguments of that call so tests can assert the
///      vault forwards exactly what it claims to, and can simulate a Safe that
///      has not enabled the module or that rejects the execution.
contract MockSafe {
    bool public moduleEnabled = true;
    bool public shouldSucceed = true;

    address public lastTo;
    uint256 public lastValue;
    bytes public lastData;
    uint8 public lastOperation;
    uint256 public callCount;

    receive() external payable {}

    function setModuleEnabled(bool enabled) external {
        moduleEnabled = enabled;
    }

    function setShouldSucceed(bool succeed) external {
        shouldSucceed = succeed;
    }

    function isModuleEnabled(address) external view returns (bool) {
        return moduleEnabled;
    }

    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external returns (bool) {
        lastTo = to;
        lastValue = value;
        lastData = data;
        lastOperation = operation;
        callCount += 1;
        return shouldSucceed;
    }
}
