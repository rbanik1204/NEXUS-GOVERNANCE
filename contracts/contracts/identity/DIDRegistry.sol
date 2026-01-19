// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title DIDRegistry
 * @notice Decentralized Identity Registry for government-grade DAO
 * @dev Privacy-preserving identity management - only hashes stored on-chain
 * 
 * Government-grade identity features:
 * - DID (Decentralized Identifier) support
 * - Privacy-preserving (no PII on-chain)
 * - Revocable identities
 * - KYC status tracking
 * - Identity verification
 */
contract DIDRegistry is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    // ============ Roles ============
    
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");

    // ============ Enums ============

    enum IdentityStatus {
        NONE,           // No identity registered
        PENDING,        // Registered, awaiting verification
        VERIFIED,       // KYC verified
        REVOKED,        // Identity revoked
        SUSPENDED       // Temporarily suspended
    }

    // ============ Structs ============

    struct Identity {
        bytes32 identityHash;       // Hash of identity document
        string didDocument;         // IPFS hash of DID document
        IdentityStatus status;
        uint256 registeredAt;
        uint256 verifiedAt;
        uint256 revokedAt;
        address verifier;           // Who verified this identity
        string jurisdiction;        // e.g., "US-CA", "IN-MH"
    }

    // ============ State Variables ============

    /// @notice Mapping from wallet address to identity
    mapping(address => Identity) public identities;

    /// @notice Mapping from identity hash to wallet (reverse lookup)
    mapping(bytes32 => address) public identityToWallet;

    /// @notice Total number of registered identities
    uint256 public totalIdentities;

    /// @notice Total number of verified identities
    uint256 public totalVerified;

    // ============ Events ============

    event IdentityRegistered(
        address indexed wallet,
        bytes32 indexed identityHash,
        string didDocument,
        uint256 timestamp
    );

    event IdentityVerified(
        address indexed wallet,
        address indexed verifier,
        uint256 timestamp
    );

    event IdentityRevoked(
        address indexed wallet,
        address indexed revoker,
        uint256 timestamp
    );

    event IdentityUpdated(
        address indexed wallet,
        bytes32 newIdentityHash,
        uint256 timestamp
    );

    event IdentitySuspended(
        address indexed wallet,
        address indexed suspender,
        uint256 timestamp
    );

    event IdentityReinstated(
        address indexed wallet,
        address indexed reinstater,
        uint256 timestamp
    );

    // ============ Errors ============

    error IdentityAlreadyExists();
    error IdentityNotFound();
    error IdentityRevoked();
    error IdentityNotVerified();
    error InvalidIdentityHash();
    error InvalidDIDDocument();
    error IdentityAlreadyVerified();
    error NotAuthorized();

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _admin) public initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMINISTRATOR_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);
    }

    // ============ Identity Registration ============

    /**
     * @notice Register a new decentralized identity
     * @param identityHash Hash of identity document (privacy-preserving)
     * @param didDocument IPFS hash of DID document
     * @param jurisdiction Jurisdiction code (e.g., "US-CA")
     */
    function registerIdentity(
        bytes32 identityHash,
        string calldata didDocument,
        string calldata jurisdiction
    ) external whenNotPaused {
        if (identities[msg.sender].status != IdentityStatus.NONE) {
            revert IdentityAlreadyExists();
        }
        if (identityHash == bytes32(0)) {
            revert InvalidIdentityHash();
        }
        if (bytes(didDocument).length == 0) {
            revert InvalidDIDDocument();
        }

        identities[msg.sender] = Identity({
            identityHash: identityHash,
            didDocument: didDocument,
            status: IdentityStatus.PENDING,
            registeredAt: block.timestamp,
            verifiedAt: 0,
            revokedAt: 0,
            verifier: address(0),
            jurisdiction: jurisdiction
        });

        identityToWallet[identityHash] = msg.sender;
        totalIdentities = totalIdentities + 1;

        emit IdentityRegistered(msg.sender, identityHash, didDocument, block.timestamp);
    }

    /**
     * @notice Verify an identity (KYC approval)
     * @param wallet Address of the identity to verify
     */
    function verifyIdentity(address wallet) external onlyRole(VERIFIER_ROLE) {
        Identity storage identity = identities[wallet];
        
        if (identity.status == IdentityStatus.NONE) {
            revert IdentityNotFound();
        }
        if (identity.status == IdentityStatus.REVOKED) {
            revert IdentityRevoked();
        }
        if (identity.status == IdentityStatus.VERIFIED) {
            revert IdentityAlreadyVerified();
        }

        identity.status = IdentityStatus.VERIFIED;
        identity.verifiedAt = block.timestamp;
        identity.verifier = msg.sender;

        totalVerified = totalVerified + 1;

        emit IdentityVerified(wallet, msg.sender, block.timestamp);
    }

    /**
     * @notice Update identity document hash
     * @param newIdentityHash New hash of identity document
     * @param newDIDDocument New IPFS hash of DID document
     */
    function updateIdentity(
        bytes32 newIdentityHash,
        string calldata newDIDDocument
    ) external whenNotPaused {
        Identity storage identity = identities[msg.sender];
        
        if (identity.status == IdentityStatus.NONE) {
            revert IdentityNotFound();
        }
        if (identity.status == IdentityStatus.REVOKED) {
            revert IdentityRevoked();
        }
        if (newIdentityHash == bytes32(0)) {
            revert InvalidIdentityHash();
        }

        // Remove old hash mapping
        delete identityToWallet[identity.identityHash];

        // Update identity
        identity.identityHash = newIdentityHash;
        identity.didDocument = newDIDDocument;
        
        // If was verified, set back to pending for re-verification
        if (identity.status == IdentityStatus.VERIFIED) {
            identity.status = IdentityStatus.PENDING;
            identity.verifiedAt = 0;
            identity.verifier = address(0);
            totalVerified = totalVerified - 1;
        }

        // Add new hash mapping
        identityToWallet[newIdentityHash] = msg.sender;

        emit IdentityUpdated(msg.sender, newIdentityHash, block.timestamp);
    }

    /**
     * @notice Revoke an identity
     * @param wallet Address of identity to revoke
     */
    function revokeIdentity(address wallet) external {
        Identity storage identity = identities[wallet];
        
        if (identity.status == IdentityStatus.NONE) {
            revert IdentityNotFound();
        }

        // Only owner or admin can revoke
        if (msg.sender != wallet && !hasRole(ADMINISTRATOR_ROLE, msg.sender)) {
            revert NotAuthorized();
        }

        if (identity.status == IdentityStatus.VERIFIED) {
            totalVerified = totalVerified - 1;
        }

        identity.status = IdentityStatus.REVOKED;
        identity.revokedAt = block.timestamp;

        emit IdentityRevoked(wallet, msg.sender, block.timestamp);
    }

    /**
     * @notice Suspend an identity temporarily
     * @param wallet Address of identity to suspend
     */
    function suspendIdentity(address wallet) external onlyRole(ADMINISTRATOR_ROLE) {
        Identity storage identity = identities[wallet];
        
        if (identity.status == IdentityStatus.NONE) {
            revert IdentityNotFound();
        }
        if (identity.status == IdentityStatus.REVOKED) {
            revert IdentityRevoked();
        }

        identity.status = IdentityStatus.SUSPENDED;

        emit IdentitySuspended(wallet, msg.sender, block.timestamp);
    }

    /**
     * @notice Reinstate a suspended identity
     * @param wallet Address of identity to reinstate
     */
    function reinstateIdentity(address wallet) external onlyRole(ADMINISTRATOR_ROLE) {
        Identity storage identity = identities[wallet];
        
        if (identity.status != IdentityStatus.SUSPENDED) {
            revert NotAuthorized();
        }

        // Reinstate to previous status (verified if was verified before)
        identity.status = identity.verifiedAt > 0 ? IdentityStatus.VERIFIED : IdentityStatus.PENDING;

        emit IdentityReinstated(wallet, msg.sender, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Check if an address has a verified identity
     * @param wallet Address to check
     * @return True if identity is verified
     */
    function isVerified(address wallet) external view returns (bool) {
        return identities[wallet].status == IdentityStatus.VERIFIED;
    }

    /**
     * @notice Get identity status
     * @param wallet Address to check
     * @return Identity status
     */
    function getIdentityStatus(address wallet) external view returns (IdentityStatus) {
        return identities[wallet].status;
    }

    /**
     * @notice Get full identity details
     * @param wallet Address to check
     * @return Identity struct
     */
    function getIdentity(address wallet) external view returns (Identity memory) {
        return identities[wallet];
    }

    /**
     * @notice Get wallet address from identity hash
     * @param identityHash Hash to lookup
     * @return Wallet address
     */
    function getWalletByIdentityHash(bytes32 identityHash) external view returns (address) {
        return identityToWallet[identityHash];
    }

    /**
     * @notice Get total statistics
     * @return total Total registered identities
     * @return verified Total verified identities
     */
    function getStatistics() external view returns (uint256 total, uint256 verified) {
        return (totalIdentities, totalVerified);
    }

    // ============ Admin Functions ============

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
