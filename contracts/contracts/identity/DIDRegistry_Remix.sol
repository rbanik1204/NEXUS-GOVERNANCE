// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/proxy/utils/Initializable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/access/AccessControlUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/utils/PausableUpgradeable.sol";

/**
 * @title DIDRegistry - Remix Version
 * @notice Decentralized Identity Registry for government-grade DAO
 */
contract DIDRegistry is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");

    enum IdentityStatus {
        NONE,
        PENDING,
        VERIFIED,
        REVOKED,
        SUSPENDED
    }

    struct Identity {
        bytes32 identityHash;
        string didDocument;
        IdentityStatus status;
        uint256 registeredAt;
        uint256 verifiedAt;
        uint256 revokedAt;
        address verifier;
        string jurisdiction;
    }

    mapping(address => Identity) public identities;
    mapping(bytes32 => address) public identityToWallet;
    uint256 public totalIdentities;
    uint256 public totalVerified;

    event IdentityRegistered(address indexed wallet, bytes32 indexed identityHash, string didDocument, uint256 timestamp);
    event IdentityVerified(address indexed wallet, address indexed verifier, uint256 timestamp);
    event IdentityRevoked(address indexed wallet, address indexed revoker, uint256 timestamp);

    error IdentityAlreadyExists();
    error IdentityNotFound();
    error IdentityAlreadyRevoked();
    error InvalidIdentityHash();
    error InvalidDIDDocument();
    error NotAuthorized();

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

    function verifyIdentity(address wallet) external onlyRole(VERIFIER_ROLE) {
        Identity storage identity = identities[wallet];
        if (identity.status == IdentityStatus.NONE) {
            revert IdentityNotFound();
        }
        if (identity.status == IdentityStatus.REVOKED) {
            revert IdentityAlreadyRevoked();
        }

        identity.status = IdentityStatus.VERIFIED;
        identity.verifiedAt = block.timestamp;
        identity.verifier = msg.sender;
        totalVerified = totalVerified + 1;

        emit IdentityVerified(wallet, msg.sender, block.timestamp);
    }

    function revokeIdentity(address wallet) external {
        Identity storage identity = identities[wallet];
        if (identity.status == IdentityStatus.NONE) {
            revert IdentityNotFound();
        }
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

    function isVerified(address wallet) external view returns (bool) {
        return identities[wallet].status == IdentityStatus.VERIFIED;
    }

    function getIdentityStatus(address wallet) external view returns (IdentityStatus) {
        return identities[wallet].status;
    }

    function getIdentity(address wallet) external view returns (Identity memory) {
        return identities[wallet];
    }

    function pause() external onlyRole(ADMINISTRATOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMINISTRATOR_ROLE) {
        _unpause();
    }
}
