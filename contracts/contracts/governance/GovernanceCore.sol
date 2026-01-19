// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title GovernanceCore
 * @notice Central governance coordinator for the DAO platform
 * @dev Implements upgradeable pattern with role-based access control
 * 
 * This contract serves as the foundation for government-grade governance:
 * - Manages governance parameters (voting periods, quorum, etc.)
 * - Coordinates with other governance modules
 * - Provides emergency pause functionality
 * - Enforces role-based permissions
 */
contract GovernanceCore is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    
    /// @notice Role for verified citizens who can participate in governance
    bytes32 public constant CITIZEN_ROLE = keccak256("CITIZEN_ROLE");
    
    /// @notice Role for delegates who can create proposals
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    
    /// @notice Role for administrators who can execute approved actions
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    
    /// @notice Role for auditors who have read-only access to all data
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    /// @notice Role for guardians who can pause the system in emergencies
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    /// @notice Role for upgrading the contract
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ============ Governance Parameters ============
    
    /// @notice Governance parameters structure
    struct GovernanceParams {
        uint256 votingPeriod;        // Duration of voting in blocks
        uint256 executionDelay;      // Delay before execution in seconds
        uint256 quorumPercentage;    // Required quorum in basis points (100 = 1%)
        uint256 proposalThreshold;   // Minimum tokens/votes to create proposal
    }

    /// @notice Current governance parameters
    GovernanceParams public params;
    
    /// @notice Total number of proposals created
    uint256 public proposalCount;
    
    /// @notice Mapping of module IDs to module addresses
    mapping(bytes4 => address) public modules;

    // ============ Events ============
    
    event GovernanceParamsUpdated(
        uint256 votingPeriod,
        uint256 executionDelay,
        uint256 quorumPercentage,
        uint256 proposalThreshold
    );
    
    event ModuleRegistered(bytes4 indexed moduleId, address indexed moduleAddress);
    event ModuleRemoved(bytes4 indexed moduleId);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer);
    event EmergencyPaused(address indexed guardian);
    event EmergencyUnpaused(address indexed guardian);

    // ============ Errors ============
    
    error InvalidVotingPeriod();
    error InvalidExecutionDelay();
    error InvalidQuorumPercentage();
    error InvalidProposalThreshold();
    error ModuleAlreadyRegistered();
    error ModuleNotFound();
    error NotDelegate();
    error SystemPaused();

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the governance contract
     * @param _admin Address of the initial administrator
     * @param _params Initial governance parameters
     */
    function initialize(
        address _admin,
        GovernanceParams memory _params
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        // Validate parameters
        _validateGovernanceParams(_params);

        // Grant roles to admin
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMINISTRATOR_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        
        // Set initial parameters
        params = _params;
        
        emit GovernanceParamsUpdated(
            _params.votingPeriod,
            _params.executionDelay,
            _params.quorumPercentage,
            _params.proposalThreshold
        );
    }

    // ============ Governance Parameter Management ============

    /**
     * @notice Update governance parameters
     * @param _newParams New governance parameters
     * @dev Only callable by administrators
     */
    function updateGovernanceParams(
        GovernanceParams memory _newParams
    ) external onlyRole(ADMINISTRATOR_ROLE) {
        _validateGovernanceParams(_newParams);
        
        params = _newParams;
        
        emit GovernanceParamsUpdated(
            _newParams.votingPeriod,
            _newParams.executionDelay,
            _newParams.quorumPercentage,
            _newParams.proposalThreshold
        );
    }

    /**
     * @notice Validate governance parameters
     * @param _params Parameters to validate
     */
    function _validateGovernanceParams(GovernanceParams memory _params) internal pure {
        if (_params.votingPeriod == 0 || _params.votingPeriod > 100000) {
            revert InvalidVotingPeriod();
        }
        if (_params.executionDelay == 0 || _params.executionDelay > 30 days) {
            revert InvalidExecutionDelay();
        }
        if (_params.quorumPercentage == 0 || _params.quorumPercentage > 10000) {
            revert InvalidQuorumPercentage();
        }
        if (_params.proposalThreshold == 0) {
            revert InvalidProposalThreshold();
        }
    }

    // ============ Module Management ============

    /**
     * @notice Register a new governance module
     * @param moduleId Unique identifier for the module
     * @param moduleAddress Address of the module contract
     * @dev Only callable by administrators
     */
    function registerModule(
        bytes4 moduleId,
        address moduleAddress
    ) external onlyRole(ADMINISTRATOR_ROLE) {
        if (modules[moduleId] != address(0)) {
            revert ModuleAlreadyRegistered();
        }
        
        modules[moduleId] = moduleAddress;
        emit ModuleRegistered(moduleId, moduleAddress);
    }

    /**
     * @notice Remove a governance module
     * @param moduleId Identifier of the module to remove
     * @dev Only callable by administrators
     */
    function removeModule(bytes4 moduleId) external onlyRole(ADMINISTRATOR_ROLE) {
        if (modules[moduleId] == address(0)) {
            revert ModuleNotFound();
        }
        
        delete modules[moduleId];
        emit ModuleRemoved(moduleId);
    }

    /**
     * @notice Get module address by ID
     * @param moduleId Module identifier
     * @return Module address
     */
    function getModule(bytes4 moduleId) external view returns (address) {
        return modules[moduleId];
    }

    // ============ Proposal Management ============

    /**
     * @notice Create a new proposal (placeholder for integration with ProposalManager)
     * @return proposalId The ID of the created proposal
     * @dev Only callable by delegates when system is not paused
     */
    function createProposal() external whenNotPaused returns (uint256) {
        if (!hasRole(DELEGATE_ROLE, msg.sender)) {
            revert NotDelegate();
        }
        
        proposalCount++;
        emit ProposalCreated(proposalCount, msg.sender);
        
        return proposalCount;
    }

    // ============ Emergency Controls ============

    /**
     * @notice Pause all governance operations
     * @dev Only callable by guardians in emergency situations
     */
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @notice Unpause governance operations
     * @dev Only callable by guardians
     */
    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    // ============ Upgrade Authorization ============

    /**
     * @notice Authorize contract upgrade
     * @param newImplementation Address of new implementation
     * @dev Only callable by upgrader role (governance-controlled)
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    // ============ View Functions ============

    /**
     * @notice Get current governance parameters
     * @return Current governance parameters
     */
    function getGovernanceParams() external view returns (GovernanceParams memory) {
        return params;
    }

    /**
     * @notice Check if an address has a specific role
     * @param role Role identifier
     * @param account Address to check
     * @return True if account has the role
     */
    function checkRole(bytes32 role, address account) external view returns (bool) {
        return hasRole(role, account);
    }

    /**
     * @notice Get the current proposal count
     * @return Number of proposals created
     */
    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }
}
