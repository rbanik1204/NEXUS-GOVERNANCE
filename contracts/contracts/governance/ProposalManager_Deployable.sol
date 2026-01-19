// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProposalManager - NEXUS DAO
 * @notice Manages proposals and voting
 * @dev Deploy this AFTER GovernanceCore
 * 
 * DEPLOYMENT CHECKLIST:
 * 1. Deploy GovernanceCore first
 * 2. Deploy this contract with GovernanceCore address
 * 3. Verify on Etherscan
 * 4. Test: createProposal() + castVote()
 */

interface IGovernanceCore {
    function isCitizen(address account) external view returns (bool);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function votingPeriod() external view returns (uint256);
    function quorumPercentage() external view returns (uint256);
    function totalCitizens() external view returns (uint256);
    function paused() external view returns (bool);
    function CITIZEN_ROLE() external view returns (bytes32);
    function DELEGATE_ROLE() external view returns (bytes32);
}

contract ProposalManager {
    // ============ TYPES ============
    enum ProposalState {
        Pending,    // 0 - Created, not yet active
        Active,     // 1 - Voting in progress
        Canceled,   // 2 - Canceled by proposer
        Defeated,   // 3 - Failed (quorum not met or majority against)
        Succeeded,  // 4 - Passed, awaiting execution
        Executed    // 5 - Successfully executed
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 startTime;
        uint256 endTime;
        ProposalState state;
        bool executed;
    }
    
    // ============ STATE ============
    IGovernanceCore public governanceCore;
    uint256 public proposalCount;
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint8)) public voteChoice; // 0=against, 1=for, 2=abstain
    
    // ============ EVENTS ============
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,      // 0=against, 1=for, 2=abstain
        uint256 weight,
        uint256 timestamp
    );
    
    event ProposalStateChanged(
        uint256 indexed proposalId,
        ProposalState oldState,
        ProposalState newState
    );
    
    event ProposalCanceled(uint256 indexed proposalId, address indexed canceler);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    
    // ============ MODIFIERS ============
    modifier whenNotPaused() {
        require(!governanceCore.paused(), "System is paused");
        _;
    }
    
    modifier onlyCitizen() {
        require(governanceCore.isCitizen(msg.sender), "Not a registered citizen");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    constructor(address _governanceCore) {
        require(_governanceCore != address(0), "Invalid governance address");
        governanceCore = IGovernanceCore(_governanceCore);
    }
    
    // ============ PROPOSAL FUNCTIONS ============
    
    /**
     * @notice Create a new proposal
     * @param description The proposal description/title
     * @return proposalId The ID of the created proposal
     */
    function createProposal(string calldata description) 
        external 
        whenNotPaused 
        onlyCitizen 
        returns (uint256) 
    {
        require(bytes(description).length > 0, "Empty description");
        require(bytes(description).length <= 10000, "Description too long");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + governanceCore.votingPeriod();
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            startTime: startTime,
            endTime: endTime,
            state: ProposalState.Active,  // Immediately active
            executed: false
        });
        
        emit ProposalCreated(proposalId, msg.sender, description, startTime, endTime);
        emit ProposalStateChanged(proposalId, ProposalState.Pending, ProposalState.Active);
        
        return proposalId;
    }
    
    /**
     * @notice Cast a vote on a proposal
     * @param proposalId The proposal to vote on
     * @param support 0=against, 1=for, 2=abstain
     */
    function castVote(uint256 proposalId, uint8 support) 
        external 
        whenNotPaused 
        onlyCitizen 
    {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(support <= 2, "Invalid vote type");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        // Record vote
        hasVoted[proposalId][msg.sender] = true;
        voteChoice[proposalId][msg.sender] = support;
        
        // Each citizen gets 1 vote (simple model)
        uint256 weight = 1;
        
        if (support == 0) {
            proposal.againstVotes += weight;
        } else if (support == 1) {
            proposal.forVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }
        
        emit VoteCast(msg.sender, proposalId, support, weight, block.timestamp);
    }
    
    /**
     * @notice Finalize a proposal after voting ends
     * @param proposalId The proposal to finalize
     */
    function finalizeProposal(uint256 proposalId) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.timestamp > proposal.endTime, "Voting not ended");
        
        ProposalState oldState = proposal.state;
        ProposalState newState;
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 totalCitizens = governanceCore.totalCitizens();
        uint256 quorumRequired = (totalCitizens * governanceCore.quorumPercentage()) / 10000;
        
        // Check quorum and majority
        if (totalVotes >= quorumRequired && proposal.forVotes > proposal.againstVotes) {
            newState = ProposalState.Succeeded;
        } else {
            newState = ProposalState.Defeated;
        }
        
        proposal.state = newState;
        emit ProposalStateChanged(proposalId, oldState, newState);
    }
    
    /**
     * @notice Cancel a proposal (only by proposer, before execution)
     * @param proposalId The proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        require(msg.sender == proposal.proposer, "Not proposer");
        require(proposal.state == ProposalState.Active || proposal.state == ProposalState.Succeeded, "Cannot cancel");
        require(!proposal.executed, "Already executed");
        
        ProposalState oldState = proposal.state;
        proposal.state = ProposalState.Canceled;
        
        emit ProposalCanceled(proposalId, msg.sender);
        emit ProposalStateChanged(proposalId, oldState, ProposalState.Canceled);
    }
    
    /**
     * @notice Mark a proposal as executed
     * @param proposalId The proposal to execute
     */
    function executeProposal(uint256 proposalId) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Succeeded, "Not succeeded");
        require(!proposal.executed, "Already executed");
        
        proposal.executed = true;
        proposal.state = ProposalState.Executed;
        
        emit ProposalExecuted(proposalId, msg.sender);
        emit ProposalStateChanged(proposalId, ProposalState.Succeeded, ProposalState.Executed);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }
    
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 startTime,
        uint256 endTime,
        uint8 state
    ) {
        Proposal storage p = proposals[proposalId];
        return (
            p.id,
            p.proposer,
            p.description,
            p.forVotes,
            p.againstVotes,
            p.abstainVotes,
            p.startTime,
            p.endTime,
            uint8(p.state)
        );
    }
    
    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        // Auto-check if voting has ended
        Proposal storage p = proposals[proposalId];
        
        if (p.state == ProposalState.Active && block.timestamp > p.endTime) {
            // Would be finalized if called
            uint256 totalVotes = p.forVotes + p.againstVotes + p.abstainVotes;
            uint256 totalCitizens = governanceCore.totalCitizens();
            uint256 quorumRequired = (totalCitizens * governanceCore.quorumPercentage()) / 10000;
            
            if (totalVotes >= quorumRequired && p.forVotes > p.againstVotes) {
                return ProposalState.Succeeded;
            } else {
                return ProposalState.Defeated;
            }
        }
        
        return p.state;
    }
    
    function hasUserVoted(uint256 proposalId, address voter) external view returns (bool) {
        return hasVoted[proposalId][voter];
    }
    
    function getUserVote(uint256 proposalId, address voter) external view returns (uint8) {
        require(hasVoted[proposalId][voter], "User has not voted");
        return voteChoice[proposalId][voter];
    }
    
    function getVoteCounts(uint256 proposalId) external view returns (
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 totalVotes
    ) {
        Proposal storage p = proposals[proposalId];
        return (
            p.forVotes,
            p.againstVotes,
            p.abstainVotes,
            p.forVotes + p.againstVotes + p.abstainVotes
        );
    }
}
