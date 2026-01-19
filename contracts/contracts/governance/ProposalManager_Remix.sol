// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/proxy/utils/Initializable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/access/AccessControlUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/utils/PausableUpgradeable.sol";

/**
 * @title ProposalManager
 * @notice Manages proposal lifecycle and state transitions
 */
contract ProposalManager is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    enum ProposalType {
        POLICY_DECISION,
        BUDGET_ALLOCATION,
        REGULATION_AMENDMENT,
        ROLE_ASSIGNMENT,
        EMERGENCY_ACTION,
        PARAMETER_UPDATE
    }

    enum ProposalState {
        DRAFT,
        ACTIVE,
        SUCCEEDED,
        DEFEATED,
        QUEUED,
        EXECUTED,
        CANCELLED,
        EXPIRED
    }

    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        ProposalState state;
        uint256 startBlock;
        uint256 endBlock;
        uint256 executionTime;
        string metadataHash;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 createdAt;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => uint256) public lastProposalTime;
    uint256 public proposalCooldown;
    address public governanceCore;

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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _governanceCore,
        uint256 _proposalCooldown
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();

        governanceCore = _governanceCore;
        proposalCooldown = _proposalCooldown;

        _grantRole(DEFAULT_ADMIN_ROLE, _governanceCore);
    }

    function createProposal(
        ProposalType proposalType,
        string calldata metadataHash,
        uint256 votingPeriod
    ) external whenNotPaused returns (uint256) {
        if (!hasRole(DELEGATE_ROLE, msg.sender)) {
            revert NotDelegate();
        }

        if (block.timestamp < lastProposalTime[msg.sender] + proposalCooldown) {
            revert ProposalCooldownActive();
        }

        if (uint8(proposalType) > uint8(ProposalType.PARAMETER_UPDATE)) {
            revert InvalidProposalType();
        }
        if (bytes(metadataHash).length == 0) {
            revert InvalidMetadataHash();
        }

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

        lastProposalTime[msg.sender] = block.timestamp;

        emit ProposalCreated(proposalId, msg.sender, proposalType, metadataHash);

        _activateProposal(proposalId, votingPeriod);

        return proposalId;
    }

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

    function castVote(
        uint256 proposalId,
        uint8 support,
        uint256 weight
    ) external whenNotPaused {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.state != ProposalState.ACTIVE) {
            revert VotingNotActive();
        }

        if (block.number < proposal.startBlock || block.number > proposal.endBlock) {
            revert VotingNotActive();
        }

        if (hasVoted[proposalId][msg.sender]) {
            revert AlreadyVoted();
        }

        hasVoted[proposalId][msg.sender] = true;

        // Fixed: Use explicit addition instead of +=
        if (support == 0) {
            proposal.againstVotes = proposal.againstVotes + weight;
        } else if (support == 1) {
            proposal.forVotes = proposal.forVotes + weight;
        } else if (support == 2) {
            proposal.abstainVotes = proposal.abstainVotes + weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function hasVotedOnProposal(
        uint256 proposalId,
        address voter
    ) external view returns (bool) {
        return hasVoted[proposalId][voter];
    }

    function getVoteCounts(uint256 proposalId) external view returns (
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.forVotes, proposal.againstVotes, proposal.abstainVotes);
    }
}
