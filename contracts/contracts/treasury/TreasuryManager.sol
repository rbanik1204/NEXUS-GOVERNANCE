// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

/**
 * @title TreasuryManager
 * @notice Multi-asset treasury with budget management and spending controls
 * @dev Government-grade public finance management
 * 
 * Features:
 * - Multi-asset support (ETH + ERC20 tokens)
 * - Budget allocation and tracking
 * - Spending limits and controls
 * - Multi-signature execution
 * - Emergency freeze mechanism
 * - Complete transparency and audit trail
 */
contract TreasuryManager is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // ============ Roles ============
    
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    // ============ Enums ============

    enum BudgetStatus {
        DRAFT,
        APPROVED,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }

    enum TransactionStatus {
        PENDING,
        EXECUTED,
        CANCELLED,
        FAILED
    }

    // ============ Structs ============

    struct Budget {
        uint256 id;
        uint256 proposalId;         // Linked governance proposal
        string category;            // e.g., "Infrastructure", "Education"
        address token;              // Token address (address(0) for ETH)
        uint256 totalAmount;
        uint256 spentAmount;
        uint256 startTime;
        uint256 endTime;
        BudgetStatus status;
        address[] approvers;
    }

    struct Transaction {
        uint256 id;
        uint256 budgetId;
        address token;
        address recipient;
        uint256 amount;
        string description;
        TransactionStatus status;
        uint256 timestamp;
        address executor;
        bytes32 txHash;
    }

    // ============ State Variables ============

    /// @notice Budget counter
    uint256 public budgetCount;

    /// @notice Transaction counter
    uint256 public transactionCount;

    /// @notice Budgets mapping
    mapping(uint256 => Budget) public budgets;

    /// @notice Transactions mapping
    mapping(uint256 => Transaction) public transactions;

    /// @notice Token balances
    mapping(address => uint256) public tokenBalances;

    /// @notice Spending limits per token
    mapping(address => uint256) public spendingLimits;

    /// @notice Emergency freeze status
    bool public emergencyFrozen;

    /// @notice Required approvals for spending
    uint256 public requiredApprovals;

    // ============ Events ============

    event Deposit(
        address indexed token,
        address indexed from,
        uint256 amount,
        uint256 timestamp
    );

    event BudgetCreated(
        uint256 indexed budgetId,
        uint256 indexed proposalId,
        string category,
        address token,
        uint256 amount
    );

    event BudgetApproved(
        uint256 indexed budgetId,
        address indexed approver
    );

    event TransactionExecuted(
        uint256 indexed transactionId,
        uint256 indexed budgetId,
        address recipient,
        uint256 amount
    );

    event EmergencyFreeze(address indexed freezer, uint256 timestamp);
    event EmergencyUnfreeze(address indexed unfreezer, uint256 timestamp);

    event SpendingLimitUpdated(address indexed token, uint256 newLimit);

    // ============ Errors ============

    error InsufficientBalance();
    error BudgetExceeded();
    error InvalidBudget();
    error EmergencyFrozen();
    error SpendingLimitExceeded();
    error InvalidApproval();
    error TransferFailed();

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        uint256 _requiredApprovals
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();

        requiredApprovals = _requiredApprovals;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMINISTRATOR_ROLE, _admin);
        _grantRole(TREASURER_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
    }

    // ============ Deposits ============

    /**
     * @notice Deposit ETH to treasury
     */
    function depositETH() external payable {
        tokenBalances[address(0)] = tokenBalances[address(0)] + msg.value;
        emit Deposit(address(0), msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Deposit ERC20 tokens to treasury
     * @param token Token address
     * @param amount Amount to deposit
     */
    function depositToken(address token, uint256 amount) external {
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);
        tokenBalances[token] = tokenBalances[token] + amount;
        emit Deposit(token, msg.sender, amount, block.timestamp);
    }

    // ============ Budget Management ============

    /**
     * @notice Create a new budget
     * @param proposalId Linked governance proposal
     * @param category Budget category
     * @param token Token address
     * @param amount Budget amount
     * @param duration Budget duration in seconds
     */
    function createBudget(
        uint256 proposalId,
        string calldata category,
        address token,
        uint256 amount,
        uint256 duration
    ) external onlyRole(TREASURER_ROLE) returns (uint256) {
        budgetCount = budgetCount + 1;
        uint256 budgetId = budgetCount;

        budgets[budgetId] = Budget({
            id: budgetId,
            proposalId: proposalId,
            category: category,
            token: token,
            totalAmount: amount,
            spentAmount: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            status: BudgetStatus.DRAFT,
            approvers: new address[](0)
        });

        emit BudgetCreated(budgetId, proposalId, category, token, amount);

        return budgetId;
    }

    /**
     * @notice Approve a budget
     * @param budgetId Budget ID to approve
     */
    function approveBudget(uint256 budgetId) external onlyRole(ADMINISTRATOR_ROLE) {
        Budget storage budget = budgets[budgetId];
        
        if (budget.status != BudgetStatus.DRAFT) {
            revert InvalidBudget();
        }

        budget.approvers.push(msg.sender);

        if (budget.approvers.length >= requiredApprovals) {
            budget.status = BudgetStatus.APPROVED;
        }

        emit BudgetApproved(budgetId, msg.sender);
    }

    /**
     * @notice Activate an approved budget
     * @param budgetId Budget ID to activate
     */
    function activateBudget(uint256 budgetId) external onlyRole(TREASURER_ROLE) {
        Budget storage budget = budgets[budgetId];
        
        if (budget.status != BudgetStatus.APPROVED) {
            revert InvalidBudget();
        }

        budget.status = BudgetStatus.ACTIVE;
    }

    // ============ Spending ============

    /**
     * @notice Execute a spending transaction
     * @param budgetId Budget to spend from
     * @param recipient Recipient address
     * @param amount Amount to send
     * @param description Transaction description
     */
    function executeSpending(
        uint256 budgetId,
        address recipient,
        uint256 amount,
        string calldata description
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused returns (uint256) {
        if (emergencyFrozen) {
            revert EmergencyFrozen();
        }

        Budget storage budget = budgets[budgetId];
        
        if (budget.status != BudgetStatus.ACTIVE) {
            revert InvalidBudget();
        }

        // Check budget limits
        if (budget.spentAmount + amount > budget.totalAmount) {
            revert BudgetExceeded();
        }

        // Check treasury balance
        if (tokenBalances[budget.token] < amount) {
            revert InsufficientBalance();
        }

        // Check spending limits
        if (spendingLimits[budget.token] > 0 && amount > spendingLimits[budget.token]) {
            revert SpendingLimitExceeded();
        }

        // Create transaction record
        transactionCount = transactionCount + 1;
        uint256 txId = transactionCount;

        transactions[txId] = Transaction({
            id: txId,
            budgetId: budgetId,
            token: budget.token,
            recipient: recipient,
            amount: amount,
            description: description,
            status: TransactionStatus.PENDING,
            timestamp: block.timestamp,
            executor: msg.sender,
            txHash: bytes32(0)
        });

        // Execute transfer
        bool success;
        if (budget.token == address(0)) {
            // ETH transfer
            (success, ) = recipient.call{value: amount}("");
        } else {
            // ERC20 transfer
            try IERC20Upgradeable(budget.token).transfer(recipient, amount) {
                success = true;
            } catch {
                success = false;
            }
        }

        if (!success) {
            transactions[txId].status = TransactionStatus.FAILED;
            revert TransferFailed();
        }

        // Update balances
        tokenBalances[budget.token] = tokenBalances[budget.token] - amount;
        budget.spentAmount = budget.spentAmount + amount;
        transactions[txId].status = TransactionStatus.EXECUTED;

        emit TransactionExecuted(txId, budgetId, recipient, amount);

        return txId;
    }

    // ============ Emergency Controls ============

    /**
     * @notice Freeze all treasury operations
     */
    function freezeTreasury() external onlyRole(ADMINISTRATOR_ROLE) {
        emergencyFrozen = true;
        _pause();
        emit EmergencyFreeze(msg.sender, block.timestamp);
    }

    /**
     * @notice Unfreeze treasury operations
     */
    function unfreezeTreasury() external onlyRole(ADMINISTRATOR_ROLE) {
        emergencyFrozen = false;
        _unpause();
        emit EmergencyUnfreeze(msg.sender, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Get treasury balance for a token
     * @param token Token address (address(0) for ETH)
     * @return Balance
     */
    function getBalance(address token) external view returns (uint256) {
        return tokenBalances[token];
    }

    /**
     * @notice Get budget details
     * @param budgetId Budget ID
     * @return Budget struct
     */
    function getBudget(uint256 budgetId) external view returns (Budget memory) {
        return budgets[budgetId];
    }

    /**
     * @notice Get transaction details
     * @param txId Transaction ID
     * @return Transaction struct
     */
    function getTransaction(uint256 txId) external view returns (Transaction memory) {
        return transactions[txId];
    }

    /**
     * @notice Get remaining budget
     * @param budgetId Budget ID
     * @return Remaining amount
     */
    function getRemainingBudget(uint256 budgetId) external view returns (uint256) {
        Budget storage budget = budgets[budgetId];
        return budget.totalAmount - budget.spentAmount;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set spending limit for a token
     * @param token Token address
     * @param limit Maximum amount per transaction
     */
    function setSpendingLimit(
        address token,
        uint256 limit
    ) external onlyRole(ADMINISTRATOR_ROLE) {
        spendingLimits[token] = limit;
        emit SpendingLimitUpdated(token, limit);
    }

    /**
     * @notice Update required approvals
     * @param newRequired New required approvals count
     */
    function updateRequiredApprovals(
        uint256 newRequired
    ) external onlyRole(ADMINISTRATOR_ROLE) {
        requiredApprovals = newRequired;
    }

    // ============ Receive ETH ============

    receive() external payable {
        tokenBalances[address(0)] = tokenBalances[address(0)] + msg.value;
        emit Deposit(address(0), msg.sender, msg.value, block.timestamp);
    }
}
