// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/proxy/utils/Initializable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/access/AccessControlUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/utils/PausableUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title GovernanceCore
 * @notice Central governance coordinator for the DAO platform
 * @dev Implements upgradeable pattern with role-based access control
 */
contract GovernanceCore is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    
    bytes32 public constant CITIZEN_ROLE = keccak256("CITIZEN_ROLE");
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ============ Governance Parameters ============
    
    struct GovernanceParams {
        uint256 votingPeriod;
        uint256 executionDelay;
        uint256 quorumPercentage;
        uint256 proposalThreshold;
    }

    GovernanceParams public params;
    uint256 public proposalCount;
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

    function initialize(
        address _admin,
        GovernanceParams memory _params
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _validateGovernanceParams(_params);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMINISTRATOR_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        
        params = _params;
        
        emit GovernanceParamsUpdated(
            _params.votingPeriod,
            _params.executionDelay,
            _params.quorumPercentage,
            _params.proposalThreshold
        );
    }

    // ============ Governance Parameter Management ============

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

    function removeModule(bytes4 moduleId) external onlyRole(ADMINISTRATOR_ROLE) {
        if (modules[moduleId] == address(0)) {
            revert ModuleNotFound();
        }
        
        delete modules[moduleId];
        emit ModuleRemoved(moduleId);
    }

    function getModule(bytes4 moduleId) external view returns (address) {
        return modules[moduleId];
    }

    // ============ Proposal Management ============

    function createProposal() external whenNotPaused returns (uint256) {
        if (!hasRole(DELEGATE_ROLE, msg.sender)) {
            revert NotDelegate();
        }
        
        proposalCount++;
        emit ProposalCreated(proposalCount, msg.sender);
        
        return proposalCount;
    }

    // ============ Emergency Controls ============

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    // ============ Upgrade Authorization ============

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    // ============ View Functions ============

    function getGovernanceParams() external view returns (GovernanceParams memory) {
        return params;
    }

    function checkRole(bytes32 role, address account) external view returns (bool) {
        return hasRole(role, account);
    }

    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }
}
