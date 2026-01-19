// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

interface IDIDRegistry {
    function isVerified(address wallet) external view returns (bool);
}

/**
 * @title CitizenRegistry
 * @notice Manages citizen registration and voting power
 * @dev Integrates with DIDRegistry for identity verification
 * 
 * Government-grade citizen management:
 * - Citizen registration with identity verification
 * - Voting power calculation
 * - Delegation tracking
 * - Citizenship status management
 */
contract CitizenRegistry is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    // ============ Roles ============
    
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    // ============ Enums ============

    enum CitizenshipStatus {
        NONE,           // Not a citizen
        PENDING,        // Application pending
        ACTIVE,         // Active citizen
        SUSPENDED,      // Temporarily suspended
        REVOKED         // Citizenship revoked
    }

    // ============ Structs ============

    struct Citizen {
        address wallet;
        CitizenshipStatus status;
        uint256 registeredAt;
        uint256 votingPower;        // Base voting power (usually 1)
        address delegatedTo;        // Address delegated to (if any)
        uint256 delegatedPower;     // Power delegated from others
        string metadata;            // IPFS hash of citizen metadata
    }

    // ============ State Variables ============

    /// @notice Reference to DID Registry
    IDIDRegistry public didRegistry;

    /// @notice Mapping from address to citizen data
    mapping(address => Citizen) public citizens;

    /// @notice List of all citizen addresses
    address[] public citizenList;

    /// @notice Total number of active citizens
    uint256 public totalCitizens;

    /// @notice Default voting power for new citizens
    uint256 public defaultVotingPower;

    // ============ Events ============

    event CitizenRegistered(
        address indexed wallet,
        uint256 votingPower,
        uint256 timestamp
    );

    event CitizenshipApproved(
        address indexed wallet,
        address indexed approver,
        uint256 timestamp
    );

    event CitizenshipRevoked(
        address indexed wallet,
        address indexed revoker,
        uint256 timestamp
    );

    event VotingPowerUpdated(
        address indexed wallet,
        uint256 oldPower,
        uint256 newPower
    );

    event VotingPowerDelegated(
        address indexed from,
        address indexed to,
        uint256 power
    );

    event DelegationRevoked(
        address indexed from,
        address indexed to
    );

    // ============ Errors ============

    error NotVerifiedIdentity();
    error AlreadyRegistered();
    error NotCitizen();
    error CitizenshipAlreadyRevoked();
    error CannotDelegateToSelf();
    error InvalidDelegation();
    error NotAuthorized();

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _didRegistry,
        uint256 _defaultVotingPower
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();

        didRegistry = IDIDRegistry(_didRegistry);
        defaultVotingPower = _defaultVotingPower;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMINISTRATOR_ROLE, _admin);
        _grantRole(REGISTRAR_ROLE, _admin);
    }

    // ============ Citizen Registration ============

    /**
     * @notice Register as a citizen
     * @param metadata IPFS hash of citizen metadata
     */
    function registerCitizen(string calldata metadata) external whenNotPaused {
        // Must have verified identity
        if (!didRegistry.isVerified(msg.sender)) {
            revert NotVerifiedIdentity();
        }

        // Cannot register twice
        if (citizens[msg.sender].status != CitizenshipStatus.NONE) {
            revert AlreadyRegistered();
        }

        citizens[msg.sender] = Citizen({
            wallet: msg.sender,
            status: CitizenshipStatus.PENDING,
            registeredAt: block.timestamp,
            votingPower: defaultVotingPower,
            delegatedTo: address(0),
            delegatedPower: 0,
            metadata: metadata
        });

        citizenList.push(msg.sender);

        emit CitizenRegistered(msg.sender, defaultVotingPower, block.timestamp);
    }

    /**
     * @notice Approve citizenship application
     * @param wallet Address to approve
     */
    function approveCitizenship(address wallet) external onlyRole(REGISTRAR_ROLE) {
        Citizen storage citizen = citizens[wallet];
        
        if (citizen.status != CitizenshipStatus.PENDING) {
            revert NotCitizen();
        }

        citizen.status = CitizenshipStatus.ACTIVE;
        totalCitizens = totalCitizens + 1;

        emit CitizenshipApproved(wallet, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke citizenship
     * @param wallet Address to revoke
     */
    function revokeCitizenship(address wallet) external onlyRole(ADMINISTRATOR_ROLE) {
        Citizen storage citizen = citizens[wallet];
        
        if (citizen.status == CitizenshipStatus.NONE) {
            revert NotCitizen();
        }

        if (citizen.status == CitizenshipStatus.ACTIVE) {
            totalCitizens = totalCitizens - 1;
        }

        // Revoke any delegations
        if (citizen.delegatedTo != address(0)) {
            _revokeDelegation(wallet);
        }

        citizen.status = CitizenshipStatus.REVOKED;

        emit CitizenshipRevoked(wallet, msg.sender, block.timestamp);
    }

    // ============ Voting Power Management ============

    /**
     * @notice Update voting power for a citizen
     * @param wallet Address to update
     * @param newPower New voting power
     */
    function updateVotingPower(
        address wallet,
        uint256 newPower
    ) external onlyRole(ADMINISTRATOR_ROLE) {
        Citizen storage citizen = citizens[wallet];
        
        if (citizen.status != CitizenshipStatus.ACTIVE) {
            revert NotCitizen();
        }

        uint256 oldPower = citizen.votingPower;
        citizen.votingPower = newPower;

        emit VotingPowerUpdated(wallet, oldPower, newPower);
    }

    /**
     * @notice Delegate voting power to another citizen
     * @param to Address to delegate to
     */
    function delegateVotingPower(address to) external whenNotPaused {
        if (msg.sender == to) {
            revert CannotDelegateToSelf();
        }

        Citizen storage delegator = citizens[msg.sender];
        Citizen storage delegate = citizens[to];

        if (delegator.status != CitizenshipStatus.ACTIVE) {
            revert NotCitizen();
        }
        if (delegate.status != CitizenshipStatus.ACTIVE) {
            revert InvalidDelegation();
        }

        // Revoke previous delegation if exists
        if (delegator.delegatedTo != address(0)) {
            _revokeDelegation(msg.sender);
        }

        // Set new delegation
        delegator.delegatedTo = to;
        delegate.delegatedPower = delegate.delegatedPower + delegator.votingPower;

        emit VotingPowerDelegated(msg.sender, to, delegator.votingPower);
    }

    /**
     * @notice Revoke voting power delegation
     */
    function revokeDelegation() external {
        Citizen storage delegator = citizens[msg.sender];
        
        if (delegator.delegatedTo == address(0)) {
            revert InvalidDelegation();
        }

        _revokeDelegation(msg.sender);
    }

    /**
     * @notice Internal function to revoke delegation
     * @param from Address revoking delegation
     */
    function _revokeDelegation(address from) internal {
        Citizen storage delegator = citizens[from];
        Citizen storage delegate = citizens[delegator.delegatedTo];

        delegate.delegatedPower = delegate.delegatedPower - delegator.votingPower;
        
        address previousDelegate = delegator.delegatedTo;
        delegator.delegatedTo = address(0);

        emit DelegationRevoked(from, previousDelegate);
    }

    // ============ View Functions ============

    /**
     * @notice Check if address is an active citizen
     * @param wallet Address to check
     * @return True if active citizen
     */
    function isCitizen(address wallet) external view returns (bool) {
        return citizens[wallet].status == CitizenshipStatus.ACTIVE;
    }

    /**
     * @notice Get effective voting power (including delegations)
     * @param wallet Address to check
     * @return Effective voting power
     */
    function getEffectiveVotingPower(address wallet) external view returns (uint256) {
        Citizen storage citizen = citizens[wallet];
        
        if (citizen.status != CitizenshipStatus.ACTIVE) {
            return 0;
        }

        // If delegated, return 0 (power is with delegate)
        if (citizen.delegatedTo != address(0)) {
            return 0;
        }

        // Return own power + delegated power
        return citizen.votingPower + citizen.delegatedPower;
    }

    /**
     * @notice Get citizen details
     * @param wallet Address to check
     * @return Citizen struct
     */
    function getCitizen(address wallet) external view returns (Citizen memory) {
        return citizens[wallet];
    }

    /**
     * @notice Get total number of citizens
     * @return Total active citizens
     */
    function getTotalCitizens() external view returns (uint256) {
        return totalCitizens;
    }

    /**
     * @notice Get all citizen addresses
     * @return Array of citizen addresses
     */
    function getAllCitizens() external view returns (address[] memory) {
        return citizenList;
    }

    /**
     * @notice Get citizenship status
     * @param wallet Address to check
     * @return Citizenship status
     */
    function getCitizenshipStatus(address wallet) external view returns (CitizenshipStatus) {
        return citizens[wallet].status;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update default voting power
     * @param newDefaultPower New default voting power
     */
    function updateDefaultVotingPower(
        uint256 newDefaultPower
    ) external onlyRole(ADMINISTRATOR_ROLE) {
        defaultVotingPower = newDefaultPower;
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(ADMINISTRATOR_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(ADMINISTRATOR_ROLE) {
        _unpause();
    }
}
