// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

interface ICitizenRegistry {
    function isCitizen(address wallet) external view returns (bool);
    function getEffectiveVotingPower(address wallet) external view returns (uint256);
}

/**
 * @title VotingEngine
 * @notice Pluggable voting strategies for government-grade governance
 * @dev Supports multiple voting mechanisms with strategy pattern
 * 
 * Voting Strategies:
 * - ONE_PERSON_ONE_VOTE: Democratic (1 citizen = 1 vote)
 * - TOKEN_WEIGHTED: Stake-based voting
 * - QUADRATIC: Quadratic voting (prevents plutocracy)
 * - DELEGATED: Liquid democracy
 * - REPUTATION_BASED: Merit-based voting
 */
contract VotingEngine is 
    Initializable,
    AccessControlUpgradeable
{
    // ============ Roles ============
    
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant PROPOSAL_MANAGER_ROLE = keccak256("PROPOSAL_MANAGER_ROLE");

    // ============ Enums ============

    enum VotingStrategy {
        ONE_PERSON_ONE_VOTE,    // 1 citizen = 1 vote
        TOKEN_WEIGHTED,          // Vote weight = token balance
        QUADRATIC,              // Vote weight = sqrt(tokens)
        DELEGATED,              // Liquid democracy
        REPUTATION_BASED        // Based on reputation score
    }

    // ============ Structs ============

    struct VotingConfig {
        VotingStrategy strategy;
        uint256 quorumPercentage;   // In basis points (100 = 1%)
        uint256 passThreshold;      // In basis points (5000 = 50%)
        bool requireCitizenship;
        bool allowDelegation;
    }

    struct VoteRecord {
        address voter;
        uint8 support;              // 0=against, 1=for, 2=abstain
        uint256 weight;
        uint256 timestamp;
        string reason;              // Optional vote reason
    }

    // ============ State Variables ============

    /// @notice Reference to Citizen Registry
    ICitizenRegistry public citizenRegistry;

    /// @notice Voting configuration per proposal
    mapping(uint256 => VotingConfig) public votingConfigs;

    /// @notice Vote records per proposal
    mapping(uint256 => VoteRecord[]) public voteRecords;

    /// @notice Has voted mapping
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Vote tallies per proposal
    mapping(uint256 => uint256) public forVotes;
    mapping(uint256 => uint256) public againstVotes;
    mapping(uint256 => uint256) public abstainVotes;

    /// @notice Total voting power per proposal (for quorum calculation)
    mapping(uint256 => uint256) public totalVotingPower;

    // ============ Events ============

    event VotingConfigSet(
        uint256 indexed proposalId,
        VotingStrategy strategy,
        uint256 quorumPercentage,
        uint256 passThreshold
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support,
        uint256 weight,
        string reason
    );

    event QuorumReached(uint256 indexed proposalId, uint256 totalVotes);
    event ProposalPassed(uint256 indexed proposalId, uint256 forVotes, uint256 againstVotes);
    event ProposalFailed(uint256 indexed proposalId, uint256 forVotes, uint256 againstVotes);

    // ============ Errors ============

    error NotCitizen();
    error AlreadyVoted();
    error InvalidSupport();
    error VotingNotActive();
    error QuorumNotReached();
    error InvalidStrategy();

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _citizenRegistry
    ) public initializer {
        __AccessControl_init();

        citizenRegistry = ICitizenRegistry(_citizenRegistry);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMINISTRATOR_ROLE, _admin);
    }

    // ============ Voting Configuration ============

    /**
     * @notice Set voting configuration for a proposal
     * @param proposalId ID of the proposal
     * @param strategy Voting strategy to use
     * @param quorumPercentage Required quorum (basis points)
     * @param passThreshold Pass threshold (basis points)
     * @param requireCitizenship Whether citizenship is required
     * @param allowDelegation Whether delegation is allowed
     */
    function setVotingConfig(
        uint256 proposalId,
        VotingStrategy strategy,
        uint256 quorumPercentage,
        uint256 passThreshold,
        bool requireCitizenship,
        bool allowDelegation
    ) external onlyRole(PROPOSAL_MANAGER_ROLE) {
        votingConfigs[proposalId] = VotingConfig({
            strategy: strategy,
            quorumPercentage: quorumPercentage,
            passThreshold: passThreshold,
            requireCitizenship: requireCitizenship,
            allowDelegation: allowDelegation
        });

        emit VotingConfigSet(proposalId, strategy, quorumPercentage, passThreshold);
    }

    // ============ Voting ============

    /**
     * @notice Cast a vote on a proposal
     * @param proposalId ID of the proposal
     * @param support Vote direction (0=against, 1=for, 2=abstain)
     * @param reason Optional reason for vote
     */
    function castVote(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) external {
        VotingConfig storage config = votingConfigs[proposalId];

        // Check citizenship if required
        if (config.requireCitizenship && !citizenRegistry.isCitizen(msg.sender)) {
            revert NotCitizen();
        }

        // Check hasn't voted
        if (hasVoted[proposalId][msg.sender]) {
            revert AlreadyVoted();
        }

        // Validate support
        if (support > 2) {
            revert InvalidSupport();
        }

        // Calculate vote weight based on strategy
        uint256 weight = _calculateVoteWeight(msg.sender, proposalId, config.strategy);

        // Record vote
        hasVoted[proposalId][msg.sender] = true;
        
        voteRecords[proposalId].push(VoteRecord({
            voter: msg.sender,
            support: support,
            weight: weight,
            timestamp: block.timestamp,
            reason: reason
        }));

        // Update tallies
        if (support == 0) {
            againstVotes[proposalId] = againstVotes[proposalId] + weight;
        } else if (support == 1) {
            forVotes[proposalId] = forVotes[proposalId] + weight;
        } else {
            abstainVotes[proposalId] = abstainVotes[proposalId] + weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight, reason);

        // Check if quorum reached
        uint256 totalVotes = forVotes[proposalId] + againstVotes[proposalId] + abstainVotes[proposalId];
        uint256 requiredQuorum = (totalVotingPower[proposalId] * config.quorumPercentage) / 10000;
        
        if (totalVotes >= requiredQuorum) {
            emit QuorumReached(proposalId, totalVotes);
        }
    }

    /**
     * @notice Calculate vote weight based on strategy
     * @param voter Address of voter
     * @param proposalId ID of proposal
     * @param strategy Voting strategy
     * @return Vote weight
     */
    function _calculateVoteWeight(
        address voter,
        uint256 proposalId,
        VotingStrategy strategy
    ) internal view returns (uint256) {
        if (strategy == VotingStrategy.ONE_PERSON_ONE_VOTE) {
            return 1;
        } else if (strategy == VotingStrategy.DELEGATED) {
            return citizenRegistry.getEffectiveVotingPower(voter);
        } else if (strategy == VotingStrategy.TOKEN_WEIGHTED) {
            // TODO: Integrate with token contract
            return citizenRegistry.getEffectiveVotingPower(voter);
        } else if (strategy == VotingStrategy.QUADRATIC) {
            // Quadratic: sqrt of voting power
            uint256 power = citizenRegistry.getEffectiveVotingPower(voter);
            return _sqrt(power);
        } else if (strategy == VotingStrategy.REPUTATION_BASED) {
            // TODO: Integrate with reputation system
            return citizenRegistry.getEffectiveVotingPower(voter);
        }
        
        return 1; // Default to 1
    }

    /**
     * @notice Calculate square root (for quadratic voting)
     * @param x Number to calculate square root of
     * @return Square root
     */
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    // ============ Result Calculation ============

    /**
     * @notice Check if proposal passed
     * @param proposalId ID of proposal
     * @return True if passed
     */
    function hasProposalPassed(uint256 proposalId) external view returns (bool) {
        VotingConfig storage config = votingConfigs[proposalId];
        
        uint256 totalVotes = forVotes[proposalId] + againstVotes[proposalId] + abstainVotes[proposalId];
        uint256 requiredQuorum = (totalVotingPower[proposalId] * config.quorumPercentage) / 10000;
        
        // Check quorum
        if (totalVotes < requiredQuorum) {
            return false;
        }

        // Check pass threshold
        uint256 totalDecisiveVotes = forVotes[proposalId] + againstVotes[proposalId];
        if (totalDecisiveVotes == 0) {
            return false;
        }

        uint256 forPercentage = (forVotes[proposalId] * 10000) / totalDecisiveVotes;
        return forPercentage >= config.passThreshold;
    }

    /**
     * @notice Get vote results
     * @param proposalId ID of proposal
     * @return forVotesCount For votes
     * @return againstVotesCount Against votes
     * @return abstainVotesCount Abstain votes
     * @return quorumReached Whether quorum was reached
     * @return passed Whether proposal passed
     */
    function getVoteResults(uint256 proposalId) external view returns (
        uint256 forVotesCount,
        uint256 againstVotesCount,
        uint256 abstainVotesCount,
        bool quorumReached,
        bool passed
    ) {
        VotingConfig storage config = votingConfigs[proposalId];
        
        forVotesCount = forVotes[proposalId];
        againstVotesCount = againstVotes[proposalId];
        abstainVotesCount = abstainVotes[proposalId];

        uint256 totalVotes = forVotesCount + againstVotesCount + abstainVotesCount;
        uint256 requiredQuorum = (totalVotingPower[proposalId] * config.quorumPercentage) / 10000;
        
        quorumReached = totalVotes >= requiredQuorum;

        if (quorumReached) {
            uint256 totalDecisiveVotes = forVotesCount + againstVotesCount;
            if (totalDecisiveVotes > 0) {
                uint256 forPercentage = (forVotesCount * 10000) / totalDecisiveVotes;
                passed = forPercentage >= config.passThreshold;
            }
        }
    }

    /**
     * @notice Get all votes for a proposal
     * @param proposalId ID of proposal
     * @return Array of vote records
     */
    function getVoteRecords(uint256 proposalId) external view returns (VoteRecord[] memory) {
        return voteRecords[proposalId];
    }

    // ============ Admin Functions ============

    /**
     * @notice Set total voting power for a proposal
     * @param proposalId ID of proposal
     * @param power Total voting power
     */
    function setTotalVotingPower(
        uint256 proposalId,
        uint256 power
    ) external onlyRole(PROPOSAL_MANAGER_ROLE) {
        totalVotingPower[proposalId] = power;
    }
}
