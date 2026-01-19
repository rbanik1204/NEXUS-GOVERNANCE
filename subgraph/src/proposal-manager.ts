import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts"
import {
    ProposalCreated as ProposalCreatedEvent,
    VoteCast as VoteCastEvent,
    ProposalStatusChanged as ProposalStatusChangedEvent,
    ProposalCanceled as ProposalCanceledEvent
} from "../generated/ProposalManager/ProposalManager"
import { Proposal, Vote, Citizen, DailyStats, MonthlyStats } from "../generated/schema"

export function handleProposalCreatedManager(event: ProposalCreatedEvent): void {
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
            proposer.participationRate = BigDecimal.fromString("0")
            proposer.save()
        }

        proposal.proposer = proposer.id
        proposal.title = "Proposal #" + event.params.proposalId.toString()
        proposal.description = ""
        proposal.proposalType = "GENERAL"
        proposal.status = "PENDING"
        proposal.createdAt = event.block.timestamp
        proposal.startTime = event.block.timestamp
        proposal.endTime = event.block.timestamp.plus(BigInt.fromI32(604800)) // 7 days
        proposal.forVotes = BigInt.fromI32(0)
        proposal.againstVotes = BigInt.fromI32(0)
        proposal.abstainVotes = BigInt.fromI32(0)
        proposal.totalVotes = BigInt.fromI32(0)
        proposal.quorumReached = false
        proposal.transactionHash = event.transaction.hash
        proposal.blockNumber = event.block.number
        proposal.save()

        proposer.totalProposals = proposer.totalProposals + 1
        proposer.save()
    }

    updateDailyStats(event.block.timestamp, "proposalCreated")
}

export function handleVoteCastManager(event: VoteCastEvent): void {
    let voteId = event.params.voter.toHexString() + "-" + event.params.proposalId.toString()
    let vote = new Vote(voteId)

    let voter = Citizen.load(event.params.voter.toHexString())
    if (voter == null) {
        voter = new Citizen(event.params.voter.toHexString())
        voter.address = event.params.voter
        voter.registeredAt = event.block.timestamp
        voter.status = "ACTIVE"
        voter.votingPower = event.params.weight
        voter.delegatedPower = BigInt.fromI32(0)
        voter.identityVerified = false
        voter.totalProposals = 0
        voter.totalVotes = 0
        voter.participationRate = BigDecimal.fromString("0")
        voter.save()
    }

    vote.voter = voter.id
    vote.proposal = event.params.proposalId.toString()
    vote.support = event.params.support == 0 ? "AGAINST" : (event.params.support == 1 ? "FOR" : "ABSTAIN")
    vote.weight = event.params.weight
    vote.reason = ""
    vote.timestamp = event.block.timestamp
    vote.transactionHash = event.transaction.hash
    vote.blockNumber = event.block.number
    vote.delegated = false
    vote.save()

    let proposal = Proposal.load(event.params.proposalId.toString())
    if (proposal != null) {
        if (event.params.support == 1) {
            proposal.forVotes = proposal.forVotes.plus(event.params.weight)
        } else if (event.params.support == 0) {
            proposal.againstVotes = proposal.againstVotes.plus(event.params.weight)
        } else {
            proposal.abstainVotes = proposal.abstainVotes.plus(event.params.weight)
        }
        proposal.totalVotes = proposal.totalVotes.plus(BigInt.fromI32(1))
        proposal.save()
    }

    voter.totalVotes = voter.totalVotes + 1
    voter.save()

    updateDailyStats(event.block.timestamp, "voteCast")
}

export function handleProposalStatusChanged(event: ProposalStatusChangedEvent): void {
    let proposal = Proposal.load(event.params.proposalId.toString())
    if (proposal != null) {
        let statusMap = ["PENDING", "ACTIVE", "CANCELED", "DEFEATED", "SUCCEEDED", "QUEUED", "EXPIRED", "EXECUTED"]
        proposal.status = statusMap[event.params.newStatus]

        if (event.params.newStatus == 7) { // EXECUTED
            proposal.executedAt = event.block.timestamp
            proposal.passed = true
        } else if (event.params.newStatus == 4) { // SUCCEEDED
            proposal.passed = true
        } else if (event.params.newStatus == 3) { // DEFEATED
            proposal.passed = false
        }

        proposal.save()
    }
}

export function handleProposalCanceled(event: ProposalCanceledEvent): void {
    let proposal = Proposal.load(event.params.proposalId.toString())
    if (proposal != null) {
        proposal.status = "CANCELED"
        proposal.canceledAt = event.block.timestamp
        proposal.save()
    }
}

function updateDailyStats(timestamp: BigInt, action: string): void {
    let dayTs = (timestamp.toI32() / 86400) * 86400
    let dayId = dayTs.toString()
    let dailyStats = DailyStats.load(dayId)

    if (dailyStats == null) {
        dailyStats = new DailyStats(dayId)
        dailyStats.date = dayId // Simplified
        dailyStats.timestamp = BigInt.fromI32(dayTs)
        dailyStats.proposalsCreated = 0
        dailyStats.votesCast = 0
        dailyStats.uniqueVoters = 0
        dailyStats.treasuryDeposits = BigInt.fromI32(0)
        dailyStats.treasuryWithdrawals = BigInt.fromI32(0)
        dailyStats.newCitizens = 0
        dailyStats.activeCitizens = 0
        dailyStats.quorumAverage = BigDecimal.fromString("0")
    }

    if (action == "proposalCreated") {
        dailyStats.proposalsCreated = dailyStats.proposalsCreated + 1
    } else if (action == "voteCast") {
        dailyStats.votesCast = dailyStats.votesCast + 1
    }

    dailyStats.save()
}
