// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/**
 * @title ProposalManager
 * @notice Manages proposal lifecycle and state transitions
 * @dev Implements state machine for proposal progression
 * 
 * Government-grade proposal management with:
 * - Multiple proposal types for different governance needs
 * - Strict state machine enforcement
 * - IPFS metadata storage
 * - Rate limiting to prevent spam
 */
contract ProposalManager is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    // ============ Roles ============
    
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    // ============ Enums ============

    /// @notice Types of proposals supported by the system
    enum ProposalType {
        POLICY_DECISION,        // General policy decisions
        BUDGET_ALLOCATION,      // Treasury spending proposals
        REGULATION_AMENDMENT,   // Changes to governance rules
        ROLE_ASSIGNMENT,        // Granting/revoking roles
        EMERGENCY_ACTION,       // Critical security actions
        PARAMETER_UPDATE        // Governance parameter changes
    }

    /// @notice States a proposal can be in
    enum ProposalState {
        DRAFT,          // Created but not yet active
        ACTIVE,         // Voting in progress
        SUCCEEDED,      // Passed quorum and majority
        DEFEATED,       // Failed to pass
        QUEUED,         // Awaiting execution delay
        EXECUTED,       // Successfully executed
        CANCELLED,      // Cancelled by proposer or admin
        EXPIRED         // Voting period ended without quorum
    }

    // ============ Structs ============

    /// @notice Proposal data structure
    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        ProposalState state;
        uint256 startBlock;
        uint256 endBlock;
        uint256 executionTime;
        string metadataHash;        // IPFS hash containing full proposal details
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 createdAt;
    }

    // ============ State Variables ============

    /// @notice Counter for proposal IDs
    uint256 public proposalCount;

    /// @notice Mapping from proposal ID to proposal data
    mapping(uint256 => Proposal) public proposals;

    /// @notice Mapping from proposal ID to voter address to vote status
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Mapping from proposer to last proposal timestamp (for rate limiting)
    mapping(address => uint256) public lastProposalTime;

    /// @notice Minimum time between proposals from same address (anti-spam)
    uint256 public proposalCooldown;

    /// @notice Reference to GovernanceCore contract
    address public governanceCore;

    // ============ Events ============

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        string metadataHash
    );

    event ProposalStateChanged(
        uint256 indexed proposalId,
        ProposalState oldState,
        ProposalState newState
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support,
        uint256 weight
    );

    event ProposalCancelled(uint256 indexed proposalId, address indexed canceller);

    // ============ Errors ============

    error NotDelegate();
    error ProposalCooldownActive();
    error InvalidProposalType();
    error InvalidMetadataHash();
    error ProposalNotFound();
    error InvalidStateTransition();
    error AlreadyVoted();
    error VotingNotActive();
    error NotProposerOrAdmin();
    error CannotCancelExecuted();

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the ProposalManager
     * @param _governanceCore Address of GovernanceCore contract
     * @param _proposalCooldown Cooldown period between proposals (seconds)
     */
    function initialize(
        address _governanceCore,
        uint256 _proposalCooldown
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();

        governanceCore = _governanceCore;
        proposalCooldown = _proposalCooldown;

        // Grant admin role to governance core
        _grantRole(DEFAULT_ADMIN_ROLE, _governanceCore);
    }

    // ============ Proposal Creation ============

    /**
     * @notice Create a new proposal
     * @param proposalType Type of proposal
     * @param metadataHash IPFS hash containing proposal details
     * @param votingPeriod Duration of voting in blocks
     * @return proposalId ID of created proposal
     */
    function createProposal(
        ProposalType proposalType,
        string calldata metadataHash,
        uint256 votingPeriod
    ) external whenNotPaused returns (uint256) {
        // Check delegate role
        if (!hasRole(DELEGATE_ROLE, msg.sender)) {
            revert NotDelegate();
        }

        // Check cooldown
        if (block.timestamp < lastProposalTime[msg.sender] + proposalCooldown) {
            revert ProposalCooldownActive();
        }

        // Validate inputs
        if (uint8(proposalType) > uint8(ProposalType.PARAMETER_UPDATE)) {
            revert InvalidProposalType();
        }
        if (bytes(metadataHash).length == 0) {
            revert InvalidMetadataHash();
        }

        // Create proposal
        proposalCount++;
        uint256 proposalId = proposalCount;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            proposalType: proposalType,
            state: ProposalState.DRAFT,
            startBlock: 0,
            endBlock: 0,
            executionTime: 0,
            metadataHash: metadataHash,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            createdAt: block.timestamp
        });

        // Update cooldown
        lastProposalTime[msg.sender] = block.timestamp;

        emit ProposalCreated(proposalId, msg.sender, proposalType, metadataHash);

        // Auto-activate proposal
        _activateProposal(proposalId, votingPeriod);

        return proposalId;
    }

    // ============ State Transitions ============

    /**
     * @notice Activate a proposal to start voting
     * @param proposalId ID of proposal to activate
     * @param votingPeriod Duration of voting in blocks
     */
    function _activateProposal(uint256 proposalId, uint256 votingPeriod) internal {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.state != ProposalState.DRAFT) {
            revert InvalidStateTransition();
        }

        proposal.state = ProposalState.ACTIVE;
        proposal.startBlock = block.number;
        proposal.endBlock = block.number + votingPeriod;

        emit ProposalStateChanged(proposalId, ProposalState.DRAFT, ProposalState.ACTIVE);
    }

    /**
     * @notice Queue a successful proposal for execution
     * @param proposalId ID of proposal to queue
     * @param executionDelay Delay before execution (seconds)
     */
    function queueProposal(
        uint256 proposalId,
        uint256 executionDelay
    ) external onlyRole(EXECUTOR_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.state != ProposalState.SUCCEEDED) {
            revert InvalidStateTransition();
        }

        proposal.state = ProposalState.QUEUED;
        proposal.executionTime = block.timestamp + executionDelay;

        emit ProposalStateChanged(proposalId, ProposalState.SUCCEEDED, ProposalState.QUEUED);
    }

    /**
     * @notice Mark proposal as executed
     * @param proposalId ID of proposal
     */
    function markExecuted(uint256 proposalId) external onlyRole(EXECUTOR_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.state != ProposalState.QUEUED) {
            revert InvalidStateTransition();
        }

        proposal.state = ProposalState.EXECUTED;

        emit ProposalStateChanged(proposalId, ProposalState.QUEUED, ProposalState.EXECUTED);
    }

    /**
     * @notice Cancel a proposal
     * @param proposalId ID of proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        // Only proposer or admin can cancel
        if (msg.sender != proposal.proposer && !hasRole(ADMINISTRATOR_ROLE, msg.sender)) {
            revert NotProposerOrAdmin();
        }

        // Cannot cancel executed proposals
        if (proposal.state == ProposalState.EXECUTED) {
            revert CannotCancelExecuted();
        }

        ProposalState oldState = proposal.state;
        proposal.state = ProposalState.CANCELLED;

        emit ProposalCancelled(proposalId, msg.sender);
        emit ProposalStateChanged(proposalId, oldState, ProposalState.CANCELLED);
    }

    /**
     * @notice Finalize voting and determine outcome
     * @param proposalId ID of proposal
     * @param quorumPercentage Required quorum in basis points
     * @param totalVotingPower Total voting power in the system
     */
    function finalizeVoting(
        uint256 proposalId,
        uint256 quorumPercentage,
        uint256 totalVotingPower
    ) external onlyRole(EXECUTOR_ROLE) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.state != ProposalState.ACTIVE) {
            revert InvalidStateTransition();
        }

        if (block.number <= proposal.endBlock) {
            revert VotingNotActive();
        }

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 quorumRequired = (totalVotingPower * quorumPercentage) / 10000;

        ProposalState newState;

        if (totalVotes < quorumRequired) {
            newState = ProposalState.EXPIRED;
        } else if (proposal.forVotes > proposal.againstVotes) {
            newState = ProposalState.SUCCEEDED;
        } else {
            newState = ProposalState.DEFEATED;
        }

        proposal.state = newState;
        emit ProposalStateChanged(proposalId, ProposalState.ACTIVE, newState);
    }

    // ============ Voting ============

    /**
     * @notice Cast a vote on a proposal
     * @param proposalId ID of proposal
     * @param support 0 = against, 1 = for, 2 = abstain
     * @param weight Voting weight of the voter
     */
    function castVote(
        uint256 proposalId,
        uint8 support,
        uint256 weight
    ) external whenNotPaused {
        Proposal storage proposal = proposals[proposalId];

        // Check proposal is active
        if (proposal.state != ProposalState.ACTIVE) {
            revert VotingNotActive();
        }

        // Check voting period
        if (block.number < proposal.startBlock || block.number > proposal.endBlock) {
            revert VotingNotActive();
        }

        // Check hasn't voted
        if (hasVoted[proposalId][msg.sender]) {
            revert AlreadyVoted();
        }

        // Record vote
        hasVoted[proposalId][msg.sender] = true;

        if (support == 0) {
            proposal.againstVotes += weight;
        } else if (support == 1) {
            proposal.forVotes += weight;
        } else if (support == 2) {
            proposal.abstainVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    // ============ View Functions ============

    /**
     * @notice Get proposal details
     * @param proposalId ID of proposal
     * @return Proposal data
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @notice Check if address has voted on proposal
     * @param proposalId ID of proposal
     * @param voter Address to check
     * @return True if voted
     */
    function hasVotedOnProposal(
        uint256 proposalId,
        address voter
    ) external view returns (bool) {
        return hasVoted[proposalId][voter];
    }

    /**
     * @notice Get vote counts for a proposal
     * @param proposalId ID of proposal
     * @return forVotes Number of votes for
     * @return againstVotes Number of votes against
     * @return abstainVotes Number of abstain votes
     */
    function getVoteCounts(uint256 proposalId) external view returns (
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.forVotes, proposal.againstVotes, proposal.abstainVotes);
    }
}
