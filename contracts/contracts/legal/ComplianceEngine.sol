// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title ComplianceEngine
 * @notice Enforces compliance rules and regulatory requirements
 * @dev Government-grade compliance and audit trail management
 * 
 * Features:
 * - Rule definition and enforcement
 * - Compliance checking
 * - Violation tracking
 * - Audit trail generation
 * - Regulatory reporting
 */
contract ComplianceEngine is 
    Initializable,
    AccessControlUpgradeable
{
    // ============ Roles ============
    
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // ============ Enums ============

    enum RuleType {
        IDENTITY_VERIFICATION,      // KYC/Identity requirements
        VOTING_ELIGIBILITY,         // Who can vote
        PROPOSAL_REQUIREMENTS,      // Proposal creation rules
        SPENDING_LIMITS,            // Treasury spending rules
        QUORUM_REQUIREMENTS,        // Voting quorum
        CONFLICT_OF_INTEREST,       // COI detection
        DATA_RETENTION,             // Data retention policies
        REPORTING_REQUIREMENT       // Mandatory reporting
    }

    enum RuleSeverity {
        INFO,           // Informational
        WARNING,        // Warning but not blocking
        ERROR,          // Blocking error
        CRITICAL        // Critical violation
    }

    enum ViolationStatus {
        OPEN,
        ACKNOWLEDGED,
        RESOLVED,
        DISMISSED
    }

    // ============ Structs ============

    struct ComplianceRule {
        uint256 id;
        RuleType ruleType;
        RuleSeverity severity;
        string name;
        string description;
        string legalReference;      // Reference to legal document
        bool active;
        uint256 createdAt;
        uint256 activatedAt;
        address creator;
    }

    struct Violation {
        uint256 id;
        uint256 ruleId;
        address violator;
        string description;
        ViolationStatus status;
        uint256 timestamp;
        address reporter;
        address resolver;
        uint256 resolvedAt;
        string resolution;
    }

    struct AuditRecord {
        uint256 id;
        string action;
        address actor;
        uint256 timestamp;
        string details;
        bytes32 dataHash;
    }

    // ============ State Variables ============

    /// @notice Rule counter
    uint256 public ruleCount;

    /// @notice Violation counter
    uint256 public violationCount;

    /// @notice Audit record counter
    uint256 public auditRecordCount;

    /// @notice Compliance rules
    mapping(uint256 => ComplianceRule) public rules;

    /// @notice Violations
    mapping(uint256 => Violation) public violations;

    /// @notice Audit records
    mapping(uint256 => AuditRecord) public auditRecords;

    /// @notice Active rules by type
    mapping(RuleType => uint256[]) public rulesByType;

    /// @notice Violations by address
    mapping(address => uint256[]) public violationsByAddress;

    /// @notice Compliance status per address
    mapping(address => bool) public isCompliant;

    // ============ Events ============

    event RuleCreated(
        uint256 indexed ruleId,
        RuleType ruleType,
        string name,
        RuleSeverity severity
    );

    event RuleActivated(uint256 indexed ruleId, uint256 timestamp);
    event RuleDeactivated(uint256 indexed ruleId, uint256 timestamp);

    event ViolationReported(
        uint256 indexed violationId,
        uint256 indexed ruleId,
        address indexed violator,
        string description
    );

    event ViolationResolved(
        uint256 indexed violationId,
        address indexed resolver,
        string resolution
    );

    event AuditRecordCreated(
        uint256 indexed recordId,
        string action,
        address indexed actor
    );

    event ComplianceStatusUpdated(
        address indexed subject,
        bool isCompliant
    );

    // ============ Errors ============

    error RuleNotFound();
    error ViolationNotFound();
    error RuleNotActive();
    error NotAuthorized();
    error InvalidStatus();

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _admin) public initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMINISTRATOR_ROLE, _admin);
        _grantRole(COMPLIANCE_OFFICER_ROLE, _admin);
        _grantRole(AUDITOR_ROLE, _admin);
    }

    // ============ Rule Management ============

    /**
     * @notice Create a new compliance rule
     * @param ruleType Type of rule
     * @param severity Severity level
     * @param name Rule name
     * @param description Rule description
     * @param legalReference Reference to legal document
     */
    function createRule(
        RuleType ruleType,
        RuleSeverity severity,
        string calldata name,
        string calldata description,
        string calldata legalReference
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) returns (uint256) {
        ruleCount = ruleCount + 1;
        uint256 ruleId = ruleCount;

        rules[ruleId] = ComplianceRule({
            id: ruleId,
            ruleType: ruleType,
            severity: severity,
            name: name,
            description: description,
            legalReference: legalReference,
            active: false,
            createdAt: block.timestamp,
            activatedAt: 0,
            creator: msg.sender
        });

        emit RuleCreated(ruleId, ruleType, name, severity);

        return ruleId;
    }

    /**
     * @notice Activate a rule
     * @param ruleId Rule ID to activate
     */
    function activateRule(uint256 ruleId) external onlyRole(ADMINISTRATOR_ROLE) {
        ComplianceRule storage rule = rules[ruleId];
        
        if (rule.id == 0) {
            revert RuleNotFound();
        }

        rule.active = true;
        rule.activatedAt = block.timestamp;
        rulesByType[rule.ruleType].push(ruleId);

        emit RuleActivated(ruleId, block.timestamp);
    }

    /**
     * @notice Deactivate a rule
     * @param ruleId Rule ID to deactivate
     */
    function deactivateRule(uint256 ruleId) external onlyRole(ADMINISTRATOR_ROLE) {
        ComplianceRule storage rule = rules[ruleId];
        
        if (rule.id == 0) {
            revert RuleNotFound();
        }

        rule.active = false;

        emit RuleDeactivated(ruleId, block.timestamp);
    }

    // ============ Violation Management ============

    /**
     * @notice Report a compliance violation
     * @param ruleId Rule that was violated
     * @param violator Address of violator
     * @param description Violation description
     */
    function reportViolation(
        uint256 ruleId,
        address violator,
        string calldata description
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) returns (uint256) {
        ComplianceRule storage rule = rules[ruleId];
        
        if (rule.id == 0) {
            revert RuleNotFound();
        }
        if (!rule.active) {
            revert RuleNotActive();
        }

        violationCount = violationCount + 1;
        uint256 violationId = violationCount;

        violations[violationId] = Violation({
            id: violationId,
            ruleId: ruleId,
            violator: violator,
            description: description,
            status: ViolationStatus.OPEN,
            timestamp: block.timestamp,
            reporter: msg.sender,
            resolver: address(0),
            resolvedAt: 0,
            resolution: ""
        });

        violationsByAddress[violator].push(violationId);

        // Update compliance status
        if (rule.severity == RuleSeverity.ERROR || rule.severity == RuleSeverity.CRITICAL) {
            isCompliant[violator] = false;
            emit ComplianceStatusUpdated(violator, false);
        }

        emit ViolationReported(violationId, ruleId, violator, description);

        // Create audit record
        _createAuditRecord(
            "VIOLATION_REPORTED",
            msg.sender,
            string(abi.encodePacked("Rule ", uint2str(ruleId), " violated by ", addressToString(violator)))
        );

        return violationId;
    }

    /**
     * @notice Resolve a violation
     * @param violationId Violation ID
     * @param resolution Resolution description
     */
    function resolveViolation(
        uint256 violationId,
        string calldata resolution
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        Violation storage violation = violations[violationId];
        
        if (violation.id == 0) {
            revert ViolationNotFound();
        }
        if (violation.status != ViolationStatus.OPEN && violation.status != ViolationStatus.ACKNOWLEDGED) {
            revert InvalidStatus();
        }

        violation.status = ViolationStatus.RESOLVED;
        violation.resolver = msg.sender;
        violation.resolvedAt = block.timestamp;
        violation.resolution = resolution;

        // Check if violator has any open violations
        bool hasOpenViolations = false;
        uint256[] storage userViolations = violationsByAddress[violation.violator];
        for (uint256 i = 0; i < userViolations.length; i = i + 1) {
            if (violations[userViolations[i]].status == ViolationStatus.OPEN) {
                hasOpenViolations = true;
                break;
            }
        }

        // Update compliance status if no open violations
        if (!hasOpenViolations) {
            isCompliant[violation.violator] = true;
            emit ComplianceStatusUpdated(violation.violator, true);
        }

        emit ViolationResolved(violationId, msg.sender, resolution);

        // Create audit record
        _createAuditRecord(
            "VIOLATION_RESOLVED",
            msg.sender,
            string(abi.encodePacked("Violation ", uint2str(violationId), " resolved"))
        );
    }

    // ============ Audit Trail ============

    /**
     * @notice Create an audit record
     * @param action Action description
     * @param actor Address performing action
     * @param details Additional details
     */
    function createAuditRecord(
        string calldata action,
        address actor,
        string calldata details
    ) external onlyRole(AUDITOR_ROLE) returns (uint256) {
        return _createAuditRecord(action, actor, details);
    }

    /**
     * @notice Internal function to create audit record
     */
    function _createAuditRecord(
        string memory action,
        address actor,
        string memory details
    ) internal returns (uint256) {
        auditRecordCount = auditRecordCount + 1;
        uint256 recordId = auditRecordCount;

        bytes32 dataHash = keccak256(abi.encodePacked(action, actor, details, block.timestamp));

        auditRecords[recordId] = AuditRecord({
            id: recordId,
            action: action,
            actor: actor,
            timestamp: block.timestamp,
            details: details,
            dataHash: dataHash
        });

        emit AuditRecordCreated(recordId, action, actor);

        return recordId;
    }

    // ============ View Functions ============

    /**
     * @notice Check if address is compliant
     * @param subject Address to check
     * @return True if compliant
     */
    function checkCompliance(address subject) external view returns (bool) {
        return isCompliant[subject];
    }

    /**
     * @notice Get rule details
     * @param ruleId Rule ID
     * @return Rule struct
     */
    function getRule(uint256 ruleId) external view returns (ComplianceRule memory) {
        return rules[ruleId];
    }

    /**
     * @notice Get violation details
     * @param violationId Violation ID
     * @return Violation struct
     */
    function getViolation(uint256 violationId) external view returns (Violation memory) {
        return violations[violationId];
    }

    /**
     * @notice Get all violations for an address
     * @param subject Address to check
     * @return Array of violation IDs
     */
    function getViolationsByAddress(address subject) external view returns (uint256[] memory) {
        return violationsByAddress[subject];
    }

    /**
     * @notice Get active rules by type
     * @param ruleType Rule type
     * @return Array of rule IDs
     */
    function getRulesByType(RuleType ruleType) external view returns (uint256[] memory) {
        return rulesByType[ruleType];
    }

    /**
     * @notice Get audit record
     * @param recordId Record ID
     * @return Audit record struct
     */
    function getAuditRecord(uint256 recordId) external view returns (AuditRecord memory) {
        return auditRecords[recordId];
    }

    // ============ Helper Functions ============

    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len = len + 1;
            j = j / 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i = _i / 10;
        }
        return string(bstr);
    }

    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i = i + 1) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
