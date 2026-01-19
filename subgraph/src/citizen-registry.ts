import { BigInt, BigDecimal } from "@graphprotocol/graph-ts"
import {
    CitizenRegistered as CitizenRegisteredEvent,
    CitizenshipApproved as CitizenshipApprovedEvent,
    CitizenshipRevoked as CitizenshipRevokedEvent,
    VotingPowerDelegated as VotingPowerDelegatedEvent,
    DelegationRevoked as DelegationRevokedEvent
} from "../generated/CitizenRegistry/CitizenRegistry"
import { Citizen, DailyStats } from "../generated/schema"

export function handleCitizenRegistered(event: CitizenRegisteredEvent): void {
    let citizen = new Citizen(event.params.wallet.toHexString())
    citizen.address = event.params.wallet
    citizen.registeredAt = event.params.timestamp
    citizen.status = "PENDING"
    citizen.votingPower = event.params.votingPower
    citizen.delegatedPower = BigInt.fromI32(0)
    citizen.identityVerified = false
    citizen.totalProposals = 0
    citizen.totalVotes = 0
    citizen.participationRate = BigDecimal.fromString("0")
    citizen.save()

    let dayTs = (event.block.timestamp.toI32() / 86400) * 86400
    let stats = DailyStats.load(dayTs.toString())
    if (stats != null) {
        stats.newCitizens = stats.newCitizens + 1
        stats.save()
    }
}

export function handleCitizenshipApproved(event: CitizenshipApprovedEvent): void {
    let citizen = Citizen.load(event.params.wallet.toHexString())
    if (citizen != null) {
        citizen.status = "ACTIVE"
        citizen.save()
    }
}

export function handleCitizenshipRevoked(event: CitizenshipRevokedEvent): void {
    let citizen = Citizen.load(event.params.wallet.toHexString())
    if (citizen != null) {
        citizen.status = "REVOKED"
        citizen.save()
    }
}

export function handleVotingPowerDelegated(event: VotingPowerDelegatedEvent): void {
    let delegator = Citizen.load(event.params.from.toHexString())
    if (delegator != null) {
        delegator.delegatedTo = event.params.to.toHexString()
        delegator.save()
    }

    let delegate = Citizen.load(event.params.to.toHexString())
    if (delegate != null) {
        delegate.delegatedPower = delegate.delegatedPower.plus(event.params.power)
        delegate.save()
    }
}

export function handleDelegationRevoked(event: DelegationRevokedEvent): void {
    let delegator = Citizen.load(event.params.from.toHexString())
    if (delegator != null) {
        delegator.delegatedTo = null
        delegator.save()
    }
}
