// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title ExecutionModule
 * @notice Handles time-locked execution of approved proposals
 * @dev Implements timelock mechanism for governance actions
 * 
 * Government-grade execution with:
 * - Mandatory execution delay for transparency
 * - Transaction queue management
 * - Cancellation before execution
 * - Batch execution support
 */
contract ExecutionModule is Initializable, AccessControlUpgradeable {
    
    // ============ Roles ============
    
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");

    // ============ Structs ============

    struct QueuedTransaction {
        uint256 proposalId;
        address target;
        uint256 value;
        bytes data;
        uint256 eta;            // Execution time
        bool executed;
        bool cancelled;
    }

    // ============ State Variables ============

    /// @notice Minimum delay before execution (seconds)
    uint256 public minDelay;

    /// @notice Maximum delay before expiration (seconds)
    uint256 public maxDelay;

    /// @notice Mapping from transaction hash to queued transaction
    mapping(bytes32 => QueuedTransaction) public queuedTransactions;

    /// @notice Mapping from proposal ID to transaction hash
    mapping(uint256 => bytes32) public proposalToTxHash;

    // ============ Events ============

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

    // ============ Errors ============

    error DelayTooShort();
    error DelayTooLong();
    error InvalidDelay();
    error TransactionNotQueued();
    error TransactionAlreadyExecuted();
    error TransactionCancelled();
    error TimelockNotMet();
    error TransactionExpired();
    error ExecutionFailed();
    error TransactionAlreadyQueued();

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the ExecutionModule
     * @param _admin Address of admin
     * @param _minDelay Minimum execution delay in seconds
     * @param _maxDelay Maximum execution delay in seconds
     */
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

    // ============ Queue Management ============

    /**
     * @notice Queue a transaction for execution
     * @param proposalId ID of the proposal
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Transaction data
     * @param delay Delay before execution (must be >= minDelay)
     * @return txHash Hash of the queued transaction
     */
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

    /**
     * @notice Execute a queued transaction
     * @param txHash Hash of the transaction to execute
     */
    function executeTransaction(bytes32 txHash) external onlyRole(EXECUTOR_ROLE) {
        QueuedTransaction storage txn = queuedTransactions[txHash];

        if (txn.eta == 0) revert TransactionNotQueued();
        if (txn.executed) revert TransactionAlreadyExecuted();
        if (txn.cancelled) revert TransactionCancelled();
        if (block.timestamp < txn.eta) revert TimelockNotMet();
        if (block.timestamp > txn.eta + maxDelay) revert TransactionExpired();

        txn.executed = true;

        (bool success, ) = txn.target.call{value: txn.value}(txn.data);
        if (!success) revert ExecutionFailed();

        emit TransactionExecuted(txHash, txn.proposalId, txn.target, txn.value, txn.data);
    }

    /**
     * @notice Cancel a queued transaction
     * @param txHash Hash of the transaction to cancel
     */
    function cancelTransaction(bytes32 txHash) external onlyRole(CANCELLER_ROLE) {
        QueuedTransaction storage txn = queuedTransactions[txHash];

        if (txn.eta == 0) revert TransactionNotQueued();
        if (txn.executed) revert TransactionAlreadyExecuted();
        if (txn.cancelled) revert TransactionCancelled();

        txn.cancelled = true;

        emit TransactionCancelled(txHash, txn.proposalId);
    }

    /**
     * @notice Execute multiple transactions in batch
     * @param txHashes Array of transaction hashes
     */
    function executeBatch(bytes32[] calldata txHashes) external onlyRole(EXECUTOR_ROLE) {
        for (uint256 i = 0; i < txHashes.length; i++) {
            executeTransaction(txHashes[i]);
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Update delay parameters
     * @param _minDelay New minimum delay
     * @param _maxDelay New maximum delay
     */
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

    // ============ View Functions ============

    /**
     * @notice Get transaction details
     * @param txHash Transaction hash
     * @return Transaction details
     */
    function getTransaction(bytes32 txHash) external view returns (QueuedTransaction memory) {
        return queuedTransactions[txHash];
    }

    /**
     * @notice Check if transaction is ready for execution
     * @param txHash Transaction hash
     * @return True if ready
     */
    function isReady(bytes32 txHash) external view returns (bool) {
        QueuedTransaction storage txn = queuedTransactions[txHash];
        return txn.eta != 0 && 
               !txn.executed && 
               !txn.cancelled && 
               block.timestamp >= txn.eta &&
               block.timestamp <= txn.eta + maxDelay;
    }

    /**
     * @notice Get transaction hash for a proposal
     * @param proposalId Proposal ID
     * @return Transaction hash
     */
    function getProposalTransaction(uint256 proposalId) external view returns (bytes32) {
        return proposalToTxHash[proposalId];
    }
}
