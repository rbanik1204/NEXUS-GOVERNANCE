// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GovernanceCore - NEXUS DAO
 * @notice Core governance parameters and role management
 * @dev Deploy this FIRST, then ProposalManager
 * 
 * DEPLOYMENT CHECKLIST:
 * 1. Deploy this contract
 * 2. Note the address
 * 3. Verify on Etherscan
 */

contract GovernanceCore {
    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    bytes32 public constant CITIZEN_ROLE = keccak256("CITIZEN_ROLE");
    
    // ============ GOVERNANCE PARAMETERS ============
    uint256 public votingPeriod;        // In seconds (e.g., 604800 = 7 days)
    uint256 public executionDelay;      // Timelock in seconds (e.g., 172800 = 48 hours)
    uint256 public quorumPercentage;    // In basis points (e.g., 1500 = 15%)
    uint256 public proposalThreshold;   // Minimum voting power to create proposal
    
    // ============ STATE ============
    address public owner;
    bool public paused;
    
    mapping(bytes32 => mapping(address => bool)) private _roles;
    mapping(address => bool) public citizens;
    uint256 public totalCitizens;
    
    // ============ EVENTS ============
    event GovernanceParametersUpdated(
        uint256 votingPeriod,
        uint256 executionDelay,
        uint256 quorumPercentage,
        uint256 proposalThreshold
    );
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event CitizenRegistered(address indexed citizen, uint256 timestamp);
    event CitizenRemoved(address indexed citizen, uint256 timestamp);
    event Paused(address account);
    event Unpaused(address account);
    
    // ============ MODIFIERS ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    constructor(
        uint256 _votingPeriod,
        uint256 _executionDelay,
        uint256 _quorumPercentage,
        uint256 _proposalThreshold
    ) {
        owner = msg.sender;
        
        votingPeriod = _votingPeriod;
        executionDelay = _executionDelay;
        quorumPercentage = _quorumPercentage;
        proposalThreshold = _proposalThreshold;
        
        // Grant deployer admin role
        _roles[ADMIN_ROLE][msg.sender] = true;
        _roles[DELEGATE_ROLE][msg.sender] = true;
        _roles[CITIZEN_ROLE][msg.sender] = true;
        
        // Register deployer as first citizen
        citizens[msg.sender] = true;
        totalCitizens = 1;
        
        emit RoleGranted(ADMIN_ROLE, msg.sender, msg.sender);
        emit CitizenRegistered(msg.sender, block.timestamp);
        emit GovernanceParametersUpdated(_votingPeriod, _executionDelay, _quorumPercentage, _proposalThreshold);
    }
    
    // ============ GOVERNANCE PARAMETER FUNCTIONS ============
    function getGovernanceParams() external view returns (
        uint256 _votingPeriod,
        uint256 _executionDelay,
        uint256 _quorumPercentage,
        uint256 _proposalThreshold
    ) {
        return (votingPeriod, executionDelay, quorumPercentage, proposalThreshold);
    }
    
    function setGovernanceParams(
        uint256 _votingPeriod,
        uint256 _executionDelay,
        uint256 _quorumPercentage,
        uint256 _proposalThreshold
    ) external onlyOwner {
        require(_votingPeriod >= 1 days, "Voting period too short");
        require(_quorumPercentage <= 10000, "Quorum cannot exceed 100%");
        
        votingPeriod = _votingPeriod;
        executionDelay = _executionDelay;
        quorumPercentage = _quorumPercentage;
        proposalThreshold = _proposalThreshold;
        
        emit GovernanceParametersUpdated(_votingPeriod, _executionDelay, _quorumPercentage, _proposalThreshold);
    }
    
    // ============ ROLE FUNCTIONS ============
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }
    
    function grantRole(bytes32 role, address account) external onlyOwner {
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }
    
    function revokeRole(bytes32 role, address account) external onlyOwner {
        require(account != owner || role != ADMIN_ROLE, "Cannot revoke owner admin");
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }
    
    // ============ CITIZEN FUNCTIONS ============
    function registerCitizen(address citizen) external onlyOwner whenNotPaused {
        require(!citizens[citizen], "Already a citizen");
        
        citizens[citizen] = true;
        _roles[CITIZEN_ROLE][citizen] = true;
        totalCitizens++;
        
        emit CitizenRegistered(citizen, block.timestamp);
        emit RoleGranted(CITIZEN_ROLE, citizen, msg.sender);
    }
    
    function removeCitizen(address citizen) external onlyOwner {
        require(citizens[citizen], "Not a citizen");
        require(citizen != owner, "Cannot remove owner");
        
        citizens[citizen] = false;
        _roles[CITIZEN_ROLE][citizen] = false;
        totalCitizens--;
        
        emit CitizenRemoved(citizen, block.timestamp);
        emit RoleRevoked(CITIZEN_ROLE, citizen, msg.sender);
    }
    
    function isCitizen(address account) external view returns (bool) {
        return citizens[account];
    }
    
    function getTotalCitizens() external view returns (uint256) {
        return totalCitizens;
    }
    
    // ============ PAUSE FUNCTIONS ============
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    // ============ OWNERSHIP ============
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        
        _roles[ADMIN_ROLE][owner] = false;
        owner = newOwner;
        _roles[ADMIN_ROLE][newOwner] = true;
        
        emit RoleRevoked(ADMIN_ROLE, msg.sender, msg.sender);
        emit RoleGranted(ADMIN_ROLE, newOwner, msg.sender);
    }
}
