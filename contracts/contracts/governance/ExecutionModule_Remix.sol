// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/proxy/utils/Initializable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/access/AccessControlUpgradeable.sol";

/**
 * @title ExecutionModule
 * @notice Handles time-locked execution of approved proposals
 */
contract ExecutionModule is Initializable, AccessControlUpgradeable {
    
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");

    struct QueuedTransaction {
        uint256 proposalId;
        address target;
        uint256 value;
        bytes data;
        uint256 eta;
        bool executed;
        bool cancelled;
    }

    uint256 public minDelay;
    uint256 public maxDelay;
    mapping(bytes32 => QueuedTransaction) public queuedTransactions;
    mapping(uint256 => bytes32) public proposalToTxHash;

    event TransactionQueued(
        bytes32 indexed txHash,
        uint256 indexed proposalId,
        address target,
        uint256 value,
        bytes data,
        uint256 eta
    );

    event TransactionExecuted(
        bytes32 indexed txHash,
        uint256 indexed proposalId,
        address target,
        uint256 value,
        bytes data
    );

    event TransactionCancelled(bytes32 indexed txHash, uint256 indexed proposalId);
    event DelayUpdated(uint256 minDelay, uint256 maxDelay);

    error DelayTooShort();
    error DelayTooLong();
    error InvalidDelay();
    error TransactionNotQueued();
    error TransactionAlreadyExecuted();
    error TxCancelled();  // Changed name to avoid conflict with event
    error TimelockNotMet();
    error TransactionExpired();
    error ExecutionFailed();
    error TransactionAlreadyQueued();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        uint256 _minDelay,
        uint256 _maxDelay
    ) public initializer {
        __AccessControl_init();

        if (_minDelay == 0) revert DelayTooShort();
        if (_maxDelay <= _minDelay) revert InvalidDelay();

        minDelay = _minDelay;
        maxDelay = _maxDelay;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
        _grantRole(CANCELLER_ROLE, _admin);

        emit DelayUpdated(_minDelay, _maxDelay);
    }

    function queueTransaction(
        uint256 proposalId,
        address target,
        uint256 value,
        bytes calldata data,
        uint256 delay
    ) external onlyRole(EXECUTOR_ROLE) returns (bytes32) {
        if (delay < minDelay) revert DelayTooShort();
        if (delay > maxDelay) revert DelayTooLong();

        uint256 eta = block.timestamp + delay;
        bytes32 txHash = keccak256(abi.encode(proposalId, target, value, data, eta));

        if (queuedTransactions[txHash].eta != 0) {
            revert TransactionAlreadyQueued();
        }

        queuedTransactions[txHash] = QueuedTransaction({
            proposalId: proposalId,
            target: target,
            value: value,
            data: data,
            eta: eta,
            executed: false,
            cancelled: false
        });

        proposalToTxHash[proposalId] = txHash;

        emit TransactionQueued(txHash, proposalId, target, value, data, eta);

        return txHash;
    }

    function executeTransaction(bytes32 txHash) public onlyRole(EXECUTOR_ROLE) {
        QueuedTransaction storage txn = queuedTransactions[txHash];

        if (txn.eta == 0) revert TransactionNotQueued();
        if (txn.executed) revert TransactionAlreadyExecuted();
        if (txn.cancelled) revert TxCancelled();
        if (block.timestamp < txn.eta) revert TimelockNotMet();
        if (block.timestamp > txn.eta + maxDelay) revert TransactionExpired();

        txn.executed = true;

        (bool success, ) = txn.target.call{value: txn.value}(txn.data);
        if (!success) revert ExecutionFailed();

        emit TransactionExecuted(txHash, txn.proposalId, txn.target, txn.value, txn.data);
    }

    function cancelTransaction(bytes32 txHash) external onlyRole(CANCELLER_ROLE) {
        QueuedTransaction storage txn = queuedTransactions[txHash];

        if (txn.eta == 0) revert TransactionNotQueued();
        if (txn.executed) revert TransactionAlreadyExecuted();
        if (txn.cancelled) revert TxCancelled();

        txn.cancelled = true;

        emit TransactionCancelled(txHash, txn.proposalId);
    }

    function executeBatch(bytes32[] calldata txHashes) external onlyRole(EXECUTOR_ROLE) {
        for (uint256 i = 0; i < txHashes.length; i = i + 1) {
            executeTransaction(txHashes[i]);
        }
    }

    function updateDelays(
        uint256 _minDelay,
        uint256 _maxDelay
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_minDelay == 0) revert DelayTooShort();
        if (_maxDelay <= _minDelay) revert InvalidDelay();

        minDelay = _minDelay;
        maxDelay = _maxDelay;

        emit DelayUpdated(_minDelay, _maxDelay);
    }

    function getTransaction(bytes32 txHash) external view returns (QueuedTransaction memory) {
        return queuedTransactions[txHash];
    }

    function isReady(bytes32 txHash) external view returns (bool) {
        QueuedTransaction storage txn = queuedTransactions[txHash];
        return txn.eta != 0 && 
               !txn.executed && 
               !txn.cancelled && 
               block.timestamp >= txn.eta &&
               block.timestamp <= txn.eta + maxDelay;
    }

    function getProposalTransaction(uint256 proposalId) external view returns (bytes32) {
        return proposalToTxHash[proposalId];
    }
}
