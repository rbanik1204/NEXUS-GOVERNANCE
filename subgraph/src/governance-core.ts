import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
    ProposalCreated as ProposalCreatedEvent,
    ParameterUpdated as ParameterUpdatedEvent,
    ModuleRegistered as ModuleRegisteredEvent,
    EmergencyPaused as EmergencyPausedEvent,
    RoleGranted as RoleGrantedEvent,
    RoleRevoked as RoleRevokedEvent
} from "../generated/GovernanceCore/GovernanceCore"
import {
    Proposal,
    GovernanceParameter,
    ParameterChange,
    AuditRecord,
    Citizen
} from "../generated/schema"

export function handleProposalCreated(event: ProposalCreatedEvent): void {
    let proposal = Proposal.load(event.params.proposalId.toString())
    if (proposal == null) {
        proposal = new Proposal(event.params.proposalId.toString())
        proposal.proposalId = event.params.proposalId

        let proposer = Citizen.load(event.params.proposer.toHexString())
        if (proposer == null) {
            proposer = new Citizen(event.params.proposer.toHexString())
            proposer.address = event.params.proposer
            proposer.registeredAt = event.block.timestamp
            proposer.status = "PENDING"
            proposer.votingPower = BigInt.fromI32(0)
            proposer.delegatedPower = BigInt.fromI32(0)
            proposer.identityVerified = false
            proposer.totalProposals = 0
            proposer.totalVotes = 0
            proposer.participationRate = BigInt.fromI32(0).toBigDecimal()
            proposer.save()
        }

        proposal.proposer = proposer.id
        proposal.title = "Proposal #" + event.params.proposalId.toString()
        proposal.description = event.params.description
        proposal.proposalType = "GENERAL"
        proposal.status = "PENDING"
        proposal.createdAt = event.block.timestamp
        proposal.startTime = event.block.timestamp
        proposal.endTime = event.block.timestamp.plus(BigInt.fromI32(604800)) // 7 days default
        proposal.forVotes = BigInt.fromI32(0)
        proposal.againstVotes = BigInt.fromI32(0)
        proposal.abstainVotes = BigInt.fromI32(0)
        proposal.totalVotes = BigInt.fromI32(0)
        proposal.quorumReached = false
        proposal.transactionHash = event.transaction.hash
        proposal.blockNumber = event.block.number
        proposal.save()
    }
}

export function handleParameterUpdated(event: ParameterUpdatedEvent): void {
    let parameter = GovernanceParameter.load(event.params.parameter)
    if (parameter == null) {
        parameter = new GovernanceParameter(event.params.parameter)
        parameter.name = event.params.parameter
    }

    parameter.previousValue = event.params.oldValue
    parameter.value = event.params.newValue
    parameter.updatedAt = event.block.timestamp
    parameter.updatedBy = event.transaction.from
    parameter.save()

    let historyId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    let history = new ParameterChange(historyId)
    history.parameter = parameter.id
    history.oldValue = event.params.oldValue
    history.newValue = event.params.newValue
    history.timestamp = event.block.timestamp
    history.changedBy = event.transaction.from
    history.transactionHash = event.transaction.hash
    history.save()
}

export function handleModuleRegistered(event: ModuleRegisteredEvent): void {
    let recordId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    let record = new AuditRecord(recordId)
    record.recordId = event.block.number.plus(event.logIndex)
    record.subject = event.params.module
    record.action = "Module Registered: " + event.params.moduleType
    record.timestamp = event.block.timestamp
    record.recordedBy = event.transaction.from
    record.category = "SYSTEM"
    record.save()
}

export function handleEmergencyPaused(event: EmergencyPausedEvent): void {
    let recordId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    let record = new AuditRecord(recordId)
    record.recordId = event.block.number.plus(event.logIndex)
    record.subject = event.params.by
    record.action = "Emergency Paused"
    record.timestamp = event.block.timestamp
    record.recordedBy = event.params.by
    record.category = "SYSTEM"
    record.save()
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
    let recordId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    let record = new AuditRecord(recordId)
    record.recordId = event.block.number.plus(event.logIndex)
    record.subject = event.params.account
    record.action = "Role Granted: " + event.params.role.toHexString()
    record.timestamp = event.block.timestamp
    record.recordedBy = event.params.sender
    record.category = "GOVERNANCE"
    record.save()
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
    let recordId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    let record = new AuditRecord(recordId)
    record.recordId = event.block.number.plus(event.logIndex)
    record.subject = event.params.account
    record.action = "Role Revoked: " + event.params.role.toHexString()
    record.timestamp = event.block.timestamp
    record.recordedBy = event.params.sender
    record.category = "GOVERNANCE"
    record.save()
}
