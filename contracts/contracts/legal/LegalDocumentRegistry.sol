// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title LegalDocumentRegistry
 * @notice Immutable registry for legal documents and governance rules
 * @dev Government-grade legal compliance and document management
 * 
 * Features:
 * - Constitution and policy storage
 * - Amendment tracking
 * - Jurisdiction mapping
 * - Document versioning
 * - Immutable audit trail
 * - Hash-based verification
 */
contract LegalDocumentRegistry is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    // ============ Roles ============
    
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant LEGAL_OFFICER_ROLE = keccak256("LEGAL_OFFICER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // ============ Enums ============

    enum DocumentType {
        CONSTITUTION,       // Founding document
        POLICY,            // Governance policy
        REGULATION,        // Regulatory rule
        AMENDMENT,         // Amendment to existing doc
        PROCEDURE,         // Operational procedure
        COMPLIANCE_RULE,   // Compliance requirement
        LEGAL_OPINION,     // Legal interpretation
        AUDIT_REPORT       // Audit findings
    }

    enum DocumentStatus {
        DRAFT,
        PROPOSED,
        APPROVED,
        ACTIVE,
        SUPERSEDED,
        REVOKED
    }

    // ============ Structs ============

    struct LegalDocument {
        uint256 id;
        DocumentType docType;
        DocumentStatus status;
        string title;
        string documentHash;        // IPFS hash of full document
        bytes32 contentHash;        // Hash of document content (for verification)
        string jurisdiction;        // e.g., "US-CA", "EU", "GLOBAL"
        uint256 proposalId;         // Linked governance proposal
        uint256 createdAt;
        uint256 approvedAt;
        uint256 effectiveDate;
        uint256 expiryDate;         // 0 = no expiry
        address author;
        address approver;
        uint256 supersededBy;       // ID of document that supersedes this
        uint256[] amendments;       // IDs of amendments
        string[] tags;              // Searchable tags
    }

    struct Amendment {
        uint256 id;
        uint256 originalDocId;
        string description;
        string documentHash;
        bytes32 contentHash;
        uint256 proposalId;
        uint256 createdAt;
        uint256 approvedAt;
        address author;
    }

    // ============ State Variables ============

    /// @notice Document counter
    uint256 public documentCount;

    /// @notice Amendment counter
    uint256 public amendmentCount;

    /// @notice Documents mapping
    mapping(uint256 => LegalDocument) public documents;

    /// @notice Amendments mapping
    mapping(uint256 => Amendment) public amendments;

    /// @notice Active constitution ID
    uint256 public activeConstitutionId;

    /// @notice Document hash to ID mapping (prevent duplicates)
    mapping(bytes32 => uint256) public hashToDocId;

    /// @notice Jurisdiction to document IDs
    mapping(string => uint256[]) public jurisdictionDocs;

    /// @notice Tag to document IDs
    mapping(string => uint256[]) public taggedDocs;

    // ============ Events ============

    event DocumentCreated(
        uint256 indexed docId,
        DocumentType docType,
        string title,
        string documentHash,
        address indexed author
    );

    event DocumentApproved(
        uint256 indexed docId,
        address indexed approver,
        uint256 timestamp
    );

    event DocumentActivated(
        uint256 indexed docId,
        uint256 effectiveDate
    );

    event DocumentSuperseded(
        uint256 indexed oldDocId,
        uint256 indexed newDocId
    );

    event AmendmentCreated(
        uint256 indexed amendmentId,
        uint256 indexed originalDocId,
        string description
    );

    event ConstitutionUpdated(
        uint256 indexed oldConstitutionId,
        uint256 indexed newConstitutionId
    );

    // ============ Errors ============

    error InvalidDocumentType();
    error DocumentNotFound();
    error DocumentAlreadyExists();
    error InvalidStatus();
    error NotAuthorized();
    error InvalidJurisdiction();
    error DocumentExpired();

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
        _grantRole(LEGAL_OFFICER_ROLE, _admin);
    }

    // ============ Document Management ============

    /**
     * @notice Create a new legal document
     * @param docType Type of document
     * @param title Document title
     * @param documentHash IPFS hash of full document
     * @param contentHash Hash of document content
     * @param jurisdiction Jurisdiction code
     * @param proposalId Linked governance proposal
     * @param effectiveDate When document becomes effective
     * @param expiryDate When document expires (0 = no expiry)
     * @param tags Searchable tags
     */
    function createDocument(
        DocumentType docType,
        string calldata title,
        string calldata documentHash,
        bytes32 contentHash,
        string calldata jurisdiction,
        uint256 proposalId,
        uint256 effectiveDate,
        uint256 expiryDate,
        string[] calldata tags
    ) external onlyRole(LEGAL_OFFICER_ROLE) returns (uint256) {
        // Check for duplicate
        if (hashToDocId[contentHash] != 0) {
            revert DocumentAlreadyExists();
        }

        documentCount = documentCount + 1;
        uint256 docId = documentCount;

        documents[docId] = LegalDocument({
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
            effectiveDate: effectiveDate,
            expiryDate: expiryDate,
            author: msg.sender,
            approver: address(0),
            supersededBy: 0,
            amendments: new uint256[](0),
            tags: tags
        });

        hashToDocId[contentHash] = docId;
        jurisdictionDocs[jurisdiction].push(docId);

        // Add to tag indices
        for (uint256 i = 0; i < tags.length; i = i + 1) {
            taggedDocs[tags[i]].push(docId);
        }

        emit DocumentCreated(docId, docType, title, documentHash, msg.sender);

        return docId;
    }

    /**
     * @notice Approve a document
     * @param docId Document ID to approve
     */
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

    /**
     * @notice Activate an approved document
     * @param docId Document ID to activate
     */
    function activateDocument(uint256 docId) external onlyRole(ADMINISTRATOR_ROLE) {
        LegalDocument storage doc = documents[docId];
        
        if (doc.id == 0) {
            revert DocumentNotFound();
        }
        if (doc.status != DocumentStatus.APPROVED) {
            revert InvalidStatus();
        }
        if (block.timestamp < doc.effectiveDate) {
            revert InvalidStatus();
        }

        doc.status = DocumentStatus.ACTIVE;

        // If constitution, update active constitution
        if (doc.docType == DocumentType.CONSTITUTION) {
            if (activeConstitutionId != 0) {
                documents[activeConstitutionId].status = DocumentStatus.SUPERSEDED;
                documents[activeConstitutionId].supersededBy = docId;
                emit ConstitutionUpdated(activeConstitutionId, docId);
            }
            activeConstitutionId = docId;
        }

        emit DocumentActivated(docId, doc.effectiveDate);
    }

    /**
     * @notice Supersede a document with a new one
     * @param oldDocId Document to supersede
     * @param newDocId New document
     */
    function supersedeDocument(
        uint256 oldDocId,
        uint256 newDocId
    ) external onlyRole(ADMINISTRATOR_ROLE) {
        LegalDocument storage oldDoc = documents[oldDocId];
        LegalDocument storage newDoc = documents[newDocId];
        
        if (oldDoc.id == 0 || newDoc.id == 0) {
            revert DocumentNotFound();
        }
        if (oldDoc.status != DocumentStatus.ACTIVE) {
            revert InvalidStatus();
        }

        oldDoc.status = DocumentStatus.SUPERSEDED;
        oldDoc.supersededBy = newDocId;

        emit DocumentSuperseded(oldDocId, newDocId);
    }

    // ============ Amendment Management ============

    /**
     * @notice Create an amendment to a document
     * @param originalDocId Original document ID
     * @param description Amendment description
     * @param documentHash IPFS hash of amendment document
     * @param contentHash Hash of amendment content
     * @param proposalId Linked governance proposal
     */
    function createAmendment(
        uint256 originalDocId,
        string calldata description,
        string calldata documentHash,
        bytes32 contentHash,
        uint256 proposalId
    ) external onlyRole(LEGAL_OFFICER_ROLE) returns (uint256) {
        LegalDocument storage doc = documents[originalDocId];
        
        if (doc.id == 0) {
            revert DocumentNotFound();
        }

        amendmentCount = amendmentCount + 1;
        uint256 amendmentId = amendmentCount;

        amendments[amendmentId] = Amendment({
            id: amendmentId,
            originalDocId: originalDocId,
            description: description,
            documentHash: documentHash,
            contentHash: contentHash,
            proposalId: proposalId,
            createdAt: block.timestamp,
            approvedAt: 0,
            author: msg.sender
        });

        doc.amendments.push(amendmentId);

        emit AmendmentCreated(amendmentId, originalDocId, description);

        return amendmentId;
    }

    /**
     * @notice Approve an amendment
     * @param amendmentId Amendment ID
     */
    function approveAmendment(uint256 amendmentId) external onlyRole(ADMINISTRATOR_ROLE) {
        Amendment storage amendment = amendments[amendmentId];
        
        if (amendment.id == 0) {
            revert DocumentNotFound();
        }

        amendment.approvedAt = block.timestamp;
    }

    // ============ View Functions ============

    /**
     * @notice Get document details
     * @param docId Document ID
     * @return Document struct
     */
    function getDocument(uint256 docId) external view returns (LegalDocument memory) {
        return documents[docId];
    }

    /**
     * @notice Get active constitution
     * @return Constitution document
     */
    function getActiveConstitution() external view returns (LegalDocument memory) {
        return documents[activeConstitutionId];
    }

    /**
     * @notice Get documents by jurisdiction
     * @param jurisdiction Jurisdiction code
     * @return Array of document IDs
     */
    function getDocumentsByJurisdiction(
        string calldata jurisdiction
    ) external view returns (uint256[] memory) {
        return jurisdictionDocs[jurisdiction];
    }

    /**
     * @notice Get documents by tag
     * @param tag Tag to search
     * @return Array of document IDs
     */
    function getDocumentsByTag(string calldata tag) external view returns (uint256[] memory) {
        return taggedDocs[tag];
    }

    /**
     * @notice Get all amendments for a document
     * @param docId Document ID
     * @return Array of amendment IDs
     */
    function getDocumentAmendments(uint256 docId) external view returns (uint256[] memory) {
        return documents[docId].amendments;
    }

    /**
     * @notice Verify document authenticity
     * @param docId Document ID
     * @param contentHash Hash to verify
     * @return True if hash matches
     */
    function verifyDocument(uint256 docId, bytes32 contentHash) external view returns (bool) {
        return documents[docId].contentHash == contentHash;
    }

    /**
     * @notice Check if document is active
     * @param docId Document ID
     * @return True if active and not expired
     */
    function isDocumentActive(uint256 docId) external view returns (bool) {
        LegalDocument storage doc = documents[docId];
        
        if (doc.status != DocumentStatus.ACTIVE) {
            return false;
        }

        if (doc.expiryDate > 0 && block.timestamp > doc.expiryDate) {
            return false;
        }

        return true;
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
