// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/proxy/utils/Initializable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/access/AccessControlUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v5.0.0/contracts/utils/PausableUpgradeable.sol";

/**
 * @title LegalDocumentRegistry - Simplified for Remix
 * @notice Immutable registry for legal documents and governance rules
 */
contract LegalDocumentRegistry is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant LEGAL_OFFICER_ROLE = keccak256("LEGAL_OFFICER_ROLE");

    enum DocumentType {
        CONSTITUTION,
        POLICY,
        REGULATION,
        AMENDMENT,
        PROCEDURE,
        COMPLIANCE_RULE,
        LEGAL_OPINION,
        AUDIT_REPORT
    }

    enum DocumentStatus {
        DRAFT,
        PROPOSED,
        APPROVED,
        ACTIVE,
        SUPERSEDED,
        REVOKED
    }

    struct LegalDocument {
        uint256 id;
        DocumentType docType;
        DocumentStatus status;
        string title;
        string documentHash;
        bytes32 contentHash;
        string jurisdiction;
        uint256 proposalId;
        uint256 createdAt;
        uint256 approvedAt;
        address author;
        address approver;
    }

    uint256 public documentCount;
    uint256 public activeConstitutionId;
    
    mapping(uint256 => LegalDocument) public documents;
    mapping(bytes32 => uint256) public hashToDocId;

    event DocumentCreated(uint256 indexed docId, DocumentType docType, string title, address indexed author);
    event DocumentApproved(uint256 indexed docId, address indexed approver, uint256 timestamp);
    event DocumentActivated(uint256 indexed docId, uint256 timestamp);
    event ConstitutionUpdated(uint256 indexed oldId, uint256 indexed newId);

    error DocumentAlreadyExists();
    error DocumentNotFound();
    error InvalidStatus();

    constructor() {
        _disableInitializers();
    }

    function initialize(address _admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMINISTRATOR_ROLE, _admin);
        _grantRole(LEGAL_OFFICER_ROLE, _admin);
    }

    function createDocument(
        DocumentType docType,
        string calldata title,
        string calldata documentHash,
        bytes32 contentHash,
        string calldata jurisdiction,
        uint256 proposalId
    ) external onlyRole(LEGAL_OFFICER_ROLE) returns (uint256) {
        if (hashToDocId[contentHash] != 0) {
            revert DocumentAlreadyExists();
        }

        documentCount = documentCount + 1;
        uint256 docId = documentCount;

        // Create document in memory first to avoid stack too deep
        LegalDocument memory newDoc = LegalDocument({
            id: docId,
            docType: docType,
            status: DocumentStatus.DRAFT,
            title: title,
            documentHash: documentHash,
            contentHash: contentHash,
            jurisdiction: jurisdiction,
            proposalId: proposalId,
            createdAt: block.timestamp,
            approvedAt: 0,
            author: msg.sender,
            approver: address(0)
        });

        documents[docId] = newDoc;
        hashToDocId[contentHash] = docId;

        emit DocumentCreated(docId, docType, title, msg.sender);
        return docId;
    }

    function approveDocument(uint256 docId) external onlyRole(ADMINISTRATOR_ROLE) {
        LegalDocument storage doc = documents[docId];
        if (doc.id == 0) {
            revert DocumentNotFound();
        }
        if (doc.status != DocumentStatus.DRAFT && doc.status != DocumentStatus.PROPOSED) {
            revert InvalidStatus();
        }

        doc.status = DocumentStatus.APPROVED;
        doc.approvedAt = block.timestamp;
        doc.approver = msg.sender;

        emit DocumentApproved(docId, msg.sender, block.timestamp);
    }

    function activateDocument(uint256 docId) external onlyRole(ADMINISTRATOR_ROLE) {
        LegalDocument storage doc = documents[docId];
        if (doc.id == 0) {
            revert DocumentNotFound();
        }
        if (doc.status != DocumentStatus.APPROVED) {
            revert InvalidStatus();
        }

        doc.status = DocumentStatus.ACTIVE;

        if (doc.docType == DocumentType.CONSTITUTION) {
            if (activeConstitutionId != 0) {
                documents[activeConstitutionId].status = DocumentStatus.SUPERSEDED;
                emit ConstitutionUpdated(activeConstitutionId, docId);
            }
            activeConstitutionId = docId;
        }

        emit DocumentActivated(docId, block.timestamp);
    }

    function getDocument(uint256 docId) external view returns (LegalDocument memory) {
        return documents[docId];
    }

    function getActiveConstitution() external view returns (LegalDocument memory) {
        return documents[activeConstitutionId];
    }

    function verifyDocument(uint256 docId, bytes32 contentHash) external view returns (bool) {
        return documents[docId].contentHash == contentHash;
    }

    function isDocumentActive(uint256 docId) external view returns (bool) {
        return documents[docId].status == DocumentStatus.ACTIVE;
    }

    function pause() external onlyRole(ADMINISTRATOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMINISTRATOR_ROLE) {
        _unpause();
    }
}
