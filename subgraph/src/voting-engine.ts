import { BigInt, BigDecimal } from "@graphprotocol/graph-ts"
import {
    VoteCast as VoteCastEvent,
    VotingStrategyChanged as VotingStrategyChangedEvent,
    DelegateChanged as DelegateChangedEvent
} from "../generated/VotingEngine/VotingEngine"
import { Vote, Proposal, Citizen, DailyStats } from "../generated/schema"

export function handleVoteCast(event: VoteCastEvent): void {
    let voteId = event.params.voter.toHexString() + "-" + event.params.proposalId.toString()
    let vote = Vote.load(voteId)

    if (vote == null) {
        vote = new Vote(voteId)
        vote.voter = event.params.voter.toHexString()
        vote.proposal = event.params.proposalId.toString()
    }

    vote.support = event.params.support == 0 ? "AGAINST" : (event.params.support == 1 ? "FOR" : "ABSTAIN")
    vote.weight = event.params.weight
    vote.reason = event.params.reason
    vote.timestamp = event.block.timestamp
    vote.transactionHash = event.transaction.hash
    vote.blockNumber = event.block.number
    vote.delegated = false // Default
    vote.save()

    let proposal = Proposal.load(event.params.proposalId.toString())
    if (proposal != null) {
        // Note: Weights are handled in ProposalManager for simplicity, but we can sync here too
        proposal.save()
    }
}

export function handleVotingStrategyChanged(event: VotingStrategyChangedEvent): void {
    // Logic to track strategy changes if needed
}

export function handleDelegateChanged(event: DelegateChangedEvent): void {
    let delegator = Citizen.load(event.params.delegator.toHexString())
    if (delegator != null) {
        delegator.delegatedTo = event.params.toDelegate.toHexString()
        delegator.save()
    }
}
