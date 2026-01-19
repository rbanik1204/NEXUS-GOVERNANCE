import { BigInt } from "@graphprotocol/graph-ts"
import {
    RuleCreated as RuleCreatedEvent,
    ViolationReported as ViolationReportedEvent,
    ViolationResolved as ViolationResolvedEvent,
    AuditRecordCreated as AuditRecordCreatedEvent
} from "../generated/ComplianceEngine/ComplianceEngine"
import { ComplianceRule, ComplianceViolation, AuditRecord } from "../generated/schema"

export function handleRuleCreated(event: RuleCreatedEvent): void {
    let rule = new ComplianceRule(event.params.ruleId.toString())
    rule.ruleId = event.params.ruleId
    let ruleTypeMap = ["IDENTITY_VERIFICATION", "VOTING_ELIGIBILITY", "PROPOSAL_REQUIREMENTS", "SPENDING_LIMITS", "QUORUM_REQUIREMENTS", "CONFLICT_OF_INTEREST", "DATA_RETENTION", "REPORTING_REQUIREMENT"]
    rule.ruleType = ruleTypeMap[event.params.ruleType]
    rule.description = event.params.description
    rule.active = true
    rule.createdAt = event.block.timestamp
    rule.violationCount = 0
    rule.save()
}

export function handleViolationReported(event: ViolationReportedEvent): void {
    let violation = new ComplianceViolation(event.params.violationId.toString())
    violation.violationId = event.params.violationId
    violation.violator = event.params.violator.toHexString()
    violation.rule = event.params.ruleId.toString()
    violation.severity = "WARNING" // Default
    violation.description = "Compliance violation reported"
    violation.reportedAt = event.block.timestamp
    violation.reportedBy = event.transaction.from
    violation.resolved = false
    violation.save()

    let rule = ComplianceRule.load(event.params.ruleId.toString())
    if (rule != null) {
        rule.violationCount = rule.violationCount + 1
        rule.save()
    }
}

export function handleViolationResolved(event: ViolationResolvedEvent): void {
    let violation = ComplianceViolation.load(event.params.violationId.toString())
    if (violation != null) {
        violation.resolved = true
        violation.resolvedAt = event.block.timestamp
        violation.resolvedBy = event.params.resolver
        violation.save()
    }
}

export function handleAuditRecordCreated(event: AuditRecordCreatedEvent): void {
    let record = new AuditRecord(event.params.recordId.toString())
    record.recordId = event.params.recordId
    record.subject = event.params.subject
    record.action = event.params.action
    record.timestamp = event.block.timestamp
    record.recordedBy = event.transaction.from
    record.category = "COMPLIANCE"
    record.save()
}
